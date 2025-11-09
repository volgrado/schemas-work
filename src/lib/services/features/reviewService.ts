/**
 * @file Implements the business logic for the spaced repetition learning (SRS) feature.
 * @module reviewService
 */

// REFINEMENT: Import the SRS namespace for all card-related types.
import type { SRS } from '$lib/types';
import * as cardService from '$lib/services/features/cardService';
import * as directoryService from '$lib/services/core/directoryService';
import type { DeckOptions } from '$lib/services/features/deckService';
import { parseTime } from '$lib/utils/time';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the next review state for a card using a modern algorithm with learning steps.
 * @param card The card that was just reviewed.
 * @param quality A numeric score representing recall quality.
 * @param options The deck options for the current session.
 * @returns A new `Card` object with updated SRS data.
 */
// REFINEMENT: Use namespaced types in the function signature.
export async function calculateNextReview(
  card: SRS.Card,
  quality: SRS.ReviewQuality,
  options: Omit<DeckOptions, 'deckId'>
): Promise<SRS.Card> {
  const srs = card.srs || {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    dueDate: 0,
    learningStep: 1, // Start in learning phase
  };

  const learningStepsMs = options.learningSteps.split(' ').map(parseTime);

  // --- State 1: Card is in the learning phase ---
  if (srs.learningStep > 0) {
    if (quality >= 3) {
      // "Good" or "Easy"
      const currentStepIndex = srs.learningStep - 1;
      if (currentStepIndex < learningStepsMs.length - 1) {
        // Advance to the next learning step
        return {
          ...card,
          srs: {
            ...srs,
            learningStep: srs.learningStep + 1,
            dueDate: Date.now() + learningStepsMs[srs.learningStep],
          },
        };
      } else {
        // Graduate the card
        return {
          ...card,
          srs: {
            ...srs,
            learningStep: 0,
            interval: options.graduatingInterval,
            dueDate: Date.now() + options.graduatingInterval * ONE_DAY_MS,
            repetitions: 1,
          },
        };
      }
    } else {
      // "Again" - Reset to the first learning step
      return {
        ...card,
        srs: {
          ...srs,
          learningStep: 1,
          repetitions: 0,
          dueDate: Date.now() + learningStepsMs[0],
        },
      };
    }
  }

  // --- State 2: Card is in the review phase (graduated) ---
  if (quality >= 3) {
    // "Good" or "Easy"
    let newInterval: number;
    if (srs.repetitions === 0) newInterval = options.graduatingInterval;
    else if (srs.repetitions === 1) newInterval = 6;
    else newInterval = Math.round(srs.interval * srs.easeFactor);

    const newEaseFactor =
      srs.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    const finalSrs: SRS.Data = {
      repetitions: srs.repetitions + 1,
      interval: newInterval,
      easeFactor: Math.max(1.3, newEaseFactor),
      dueDate: Date.now() + newInterval * ONE_DAY_MS,
      learningStep: 0,
    };
    return { ...card, srs: finalSrs };
  } else {
    // "Again" - Card lapses, re-enter learning phase
    const newSrs: SRS.Data = {
      repetitions: 0,
      interval: 0,
      easeFactor: Math.max(1.3, srs.easeFactor - 0.2),
      dueDate: Date.now() + learningStepsMs[0],
      learningStep: 1,
    };
    return { ...card, srs: newSrs };
  }
}

/**
 * Retrieves all cards that are currently due for review.
 * @param [deckIds] - Optional array of document IDs to scope the search.
 */
export async function getDueCards(deckIds?: string[]): Promise<SRS.Card[]> {
  const allCards = deckIds
    ? await cardService.getCardsByDeckIds(deckIds)
    : await cardService.getAllCards();
  const now = Date.now();
  return allCards.filter(
    (card) =>
      !card.suspended &&
      (!card.srs || !card.srs.dueDate || card.srs.dueDate <= now)
  );
}

/**
 * Gathers Anki-style statistics (new, learning, due) for all decks.
 */
export async function getAllDeckStats(): Promise<
  Map<string, { title: string; new: number; learning: number; due: number }>
> {
  const allDocs = await directoryService.getAllItems();
  const allCards = await cardService.getAllCards();
  const now = Date.now();
  const stats = new Map<
    string,
    { title: string; new: number; learning: number; due: number }
  >();
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
    const srs = card.srs;

    if (!srs || srs.repetitions === 0) deckStat.new++;
    else if (srs.learningStep > 0 && srs.dueDate <= now) deckStat.learning++;
    else if (srs.dueDate <= now) deckStat.due++;
  }
  return stats;
}

/**
 * Identifies the user's "weakest" cards, defined as those with the lowest ease factor.
 * @param count The number of weakest cards to retrieve.
 */
export async function getWeakestCards(count: number): Promise<SRS.Card[]> {
  const allCards = await cardService.getAllCards();
  const sortedCards = allCards.sort(
    (a, b) => (a.srs?.easeFactor ?? 2.5) - (b.srs?.easeFactor ?? 2.5)
  );
  return sortedCards.slice(0, count);
}

/**
 * Evaluates a user's typed answer against the correct answer and assigns a quality score.
 * @param userAnswer The answer typed by the user.
 * @param correctAnswer The correct answer stored on the card.
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
