/**
 * @file reviewService.ts
 * @module study
 * @description
 * Implements the core business logic for the Spaced Repetition System (SRS).
 *
 * This service is responsible for:
 * - Calculating the next review interval based on user performance (using a modified SM-2 algorithm).
 * - Determining which cards are currently due for review.
 * - Calculating deck-level statistics (new, learning, due).
 * - Identifying problematic cards ("leeches" or low ease).
 * - Evaluating user answers for input-based cards.
 */

import type { SRS } from '$lib/types';
import * as cardService from './cardService';
import { fileSystemStore } from '@modules/file-system';
import type { DeckOptions } from './deckService';
import { parseTime } from '$lib/core/utils/time';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the updated SRS state for a card after a review session.
 *
 * This implementation supports a hybrid Learning/Review phase model:
 * 1. **Learning Phase:** Cards move through a series of short steps (e.g., "1m 10m").
 *    Failure resets the card to the first step.
 * 2. **Review Phase:** Graduated cards use an exponential scheduling algorithm based on
 *    Ease Factor and Interval.
 *
 * @param card - The card that was reviewed.
 * @param quality - The recall quality score (0=Again, 3=Hard, 4=Good, 5=Easy).
 * @param options - The configuration options for the current deck (e.g., learning steps).
 * @returns {Promise<SRS.Card>} A new Card object with updated scheduling data.
 */
import * as scheduler from './scheduler';

/**
 * Calculates the updated SRS state for a card after a review session.
 * Delegates to the robust scheduler module.
 */
export async function calculateNextReview(
  card: SRS.Card,
  quality: SRS.ReviewQuality,
  options: Omit<DeckOptions, 'deckId'>
): Promise<SRS.Card> {
  return scheduler.calculateNextReview(card, quality, options);
}

/**
 * Retrieves all cards that are currently due for review across the vault or specific decks.
 *
 * @param deckIds - (Optional) An array of deck IDs to filter by. If omitted, checks all decks.
 * @returns {Promise<SRS.Card[]>} An array of due cards.
 */
export async function getDueCards(deckIds?: string[]): Promise<SRS.Card[]> {
  const allCards = deckIds
    ? await cardService.getCardsByDeckIds(deckIds)
    : await cardService.getAllCards();

  const now = Date.now();

  return allCards.filter(
    (card) =>
      !card.suspended && // Skip manually suspended cards
      (!card.srs || !card.srs.dueDate || card.srs.dueDate <= now)
  );
}

/**
 * Aggregates Anki-style statistics (New, Learning, Due) for all decks in the system.
 * Useful for populating the "Study Hub" dashboard.
 *
 * @returns {Promise<Map<string, { title: string; new: number; learning: number; due: number }>>}
 * A map where keys are deck IDs and values are the statistical summary.
 */
export async function getAllDeckStats(): Promise<
  Map<string, { title: string; new: number; learning: number; due: number }>
> {
  const allDocs = fileSystemStore.getAll();
  const allCards = await cardService.getAllCards();
  const now = Date.now();

  const stats = new Map<
    string,
    { title: string; new: number; learning: number; due: number }
  >();

  // Create a lookup for document titles
  const docTitleMap = new Map(allDocs.map((doc) => [doc.id, doc.title]));

  for (const card of allCards) {
    if (card.suspended) continue;

    if (!stats.has(card.deckId)) {
      stats.set(card.deckId, {
        title: docTitleMap.get(card.deckId) || 'Untitled',
        new: 0,
        learning: 0,
        due: 0,
      });
    }

    const deckStat = stats.get(card.deckId)!;
    const state = scheduler.getCardState(card);

    if (state === 'new') {
      deckStat.new++;
    } else if (state === 'learning' || state === 'relearning') {
      // Only count as learning if due? Or total in queue?
      // Anki counts total in learning queue usually.
      // But for "Due" count in UI, we usually want what is actionable.
      // Let's stick to actionable for now to match getDueCards logic.
      if (card.srs.dueDate <= now) {
        deckStat.learning++;
      }
    } else if (state === 'review') {
      if (card.srs.dueDate <= now) {
        deckStat.due++;
      }
    }
  }
  return stats;
}

/**
 * Identifies the user's "weakest" cards, defined as those with the lowest ease factor.
 * These represent concepts the user struggles with the most.
 *
 * @param count - The maximum number of cards to retrieve.
 * @returns {Promise<SRS.Card[]>} The list of difficult cards.
 */
export async function getWeakestCards(count: number): Promise<SRS.Card[]> {
  const allCards = await cardService.getAllCards();
  const sortedCards = allCards.sort(
    (a, b) => (a.srs?.easeFactor ?? 2.5) - (b.srs?.easeFactor ?? 2.5)
  );
  return sortedCards.slice(0, count);
}

/**
 * Evaluates a user's typed answer against the correct answer for Input cards.
 * Currently uses a simple exact string match (normalized).
 *
 * @param userAnswer - The answer typed by the user.
 * @param correctAnswer - The correct answer stored on the card.
 * @returns {Promise<SRS.ReviewQuality>} A quality score (5 for correct, 0 for incorrect).
 */
export async function evaluateAnswer(
  userAnswer: string,
  correctAnswer: string
): Promise<SRS.ReviewQuality> {
  const normalizedUserAnswer = userAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return 5; // Perfect recall -> Easy
  }
  return 0; // Incorrect -> Again
}
