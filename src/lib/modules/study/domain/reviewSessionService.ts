/**
 * @file reviewSessionService.ts
 * @module study.domain
 * @description
 * Orchestrates the "Review Session" use case.
 * Coordinates between CardService, ReviewService, and ReviewLogService to
 * manage the flow of a study session.
 */

import type { SRS } from '$lib/types';
import type { DeckOptions } from './deckService';
import * as cardService from './cardService';
import * as reviewService from './reviewService';
import * as reviewLogService from './reviewLogService';
import * as deckService from './deckService';
import { i18n } from '$lib/utils/i18n.svelte';

export interface SessionInitializationResult {
  cards: SRS.Card[];
  options: Omit<DeckOptions, 'deckId'>;
  type: string; // Description of the session type (e.g. "Scheduled Review")
}

export interface ReviewProcessingResult {
  updatedCard: SRS.Card;
  isCorrect: boolean;
  shouldRequeue: boolean;
}

import * as scheduler from './scheduler';

export class ReviewSessionService {
  /**
   * Prepares a standard review session by fetching due cards and applying limits.
   */
  static async initializeScheduledSession(
    deckIds?: string[]
  ): Promise<SessionInitializationResult | null> {
    const options =
      deckIds && deckIds.length > 0
        ? await deckService.getDeckOptions(deckIds[0])
        : { deckId: 'default', ...deckService.defaultDeckOptions };

    const dueCards = await reviewService.getDueCards(deckIds);

    // Split into queues using robust scheduler state
    const newCards = dueCards.filter((c) => scheduler.getCardState(c) === 'new');
    const learningCards = dueCards.filter(
      (c) =>
        scheduler.getCardState(c) === 'learning' ||
        scheduler.getCardState(c) === 'relearning'
    );
    const reviewCards = dueCards.filter(
      (c) => scheduler.getCardState(c) === 'review'
    );

    // Apply limits
    const limitedNewCards = newCards.slice(0, options.maxNewCardsPerDay);
    const remainingReviewSlots =
      options.maxReviewsPerDay - limitedNewCards.length;
    const limitedReviewCards = reviewCards.slice(
      0,
      Math.max(0, remainingReviewSlots)
    );

    // Combine and sort
    // Order: Learning -> Review (by interval) -> New
    const finalCards: SRS.Card[] = [
      ...learningCards,
      ...limitedReviewCards.sort((a, b) => a.srs.interval - b.srs.interval),
      ...limitedNewCards,
    ];

    if (finalCards.length === 0) {
      return null;
    }

    return {
      cards: finalCards,
      options,
      type: i18n.t('review.scheduled_review'),
    };
  }

  /**
   * Prepares an additional review session using the weakest cards.
   */
  static async initializeWeakestCardsSession(
    count: number,
    deckIds?: string[]
  ): Promise<SessionInitializationResult | null> {
    const weakestCards = await reviewService.getWeakestCards(count);

    if (weakestCards.length === 0) {
      return null;
    }

    const options = { deckId: 'default', ...deckService.defaultDeckOptions };

    return {
      cards: weakestCards,
      options,
      type: i18n.t('review.additional_review'),
    };
  }

  /**
   * Processes a user's rating for a card, updates the DB, and logs the review.
   */
  static async processReview(
    card: SRS.Card,
    quality: SRS.ReviewQuality,
    options: Omit<DeckOptions, 'deckId'>
  ): Promise<ReviewProcessingResult> {
    // 1. Calculate next state
    const updatedCard = await reviewService.calculateNextReview(
      card,
      quality,
      options
    );

    // 2. Determine state for logging
    const srs = card.srs;
    let logState: reviewLogService.ReviewLog['state'] = 'review';
    if (!srs || srs.learningStep > 0) {
      logState = quality < 3 ? 'relearn' : 'learn';
    } else {
      logState = quality < 3 ? 'relearn' : 'review';
    }

    // 3. Update Database
    await cardService.updateCard(updatedCard);

    // 4. Log Review
    await reviewLogService.logReview({
      cardId: card.id,
      deckId: card.deckId,
      reviewTime: Date.now(),
      quality,
      newEase: updatedCard.srs.easeFactor,
      newInterval: updatedCard.srs.interval,
      state: logState,
    });

    return {
      updatedCard,
      isCorrect: quality >= 3,
      shouldRequeue: quality < 3,
    };
  }
}
