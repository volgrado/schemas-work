/**
 * @file Implements the business logic for the spaced repetition learning (SRS) feature.
 * @module reviewService
 */

import type { Card, ReviewQuality, SrsData } from '$lib/types';
import * as cardService from '$lib/services/features/cardService';
import * as directoryService from '$lib/services/core/directoryService';
import type { DeckOptions } from '$lib/services/features/deckService'; // Import DeckOptions
import { parseTime } from '$lib/utils/time'; // Import the time parser

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the next review state for a card using a modern algorithm with learning steps.
 * @param card The card that was just reviewed.
 * @param quality A numeric score representing recall quality (0-5).
 * @param options The deck options for the current session.
 * @returns A new `Card` object with updated SRS data.
 */
export async function calculateNextReview(
  card: Card,
  quality: ReviewQuality,
  options: Omit<DeckOptions, 'deckId'>
): Promise<Card> {
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
            learningStep: 0, // 0 means graduated
            interval: options.graduatingInterval,
            dueDate: Date.now() + options.graduatingInterval * ONE_DAY_MS,
            repetitions: 1, // First successful "review" repetition
          },
        };
      }
    } else {
      // "Again"
      // Reset to the first learning step
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
    let newRepetitions: number;

    if (srs.repetitions === 0) {
      // Fallback for an odd state
      newInterval = options.graduatingInterval;
      newRepetitions = 1;
    } else if (srs.repetitions === 1) {
      newInterval = 6; // Standard second interval
      newRepetitions = 2;
    } else {
      newInterval = Math.round(srs.interval * srs.easeFactor);
      newRepetitions = srs.repetitions + 1;
    }

    const newEaseFactor =
      srs.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    const finalSrs: SrsData = {
      repetitions: newRepetitions,
      interval: newInterval,
      easeFactor: Math.max(1.3, newEaseFactor),
      dueDate: Date.now() + newInterval * ONE_DAY_MS,
      learningStep: 0,
    };
    return { ...card, srs: finalSrs };
  } else {
    // "Again" - Card lapses, re-enter learning phase
    const newSrs: SrsData = {
      repetitions: 0,
      interval: 0, // Interval is now controlled by learning steps
      easeFactor: Math.max(1.3, srs.easeFactor - 0.2),
      dueDate: Date.now() + learningStepsMs[0],
      learningStep: 1, // Re-enter learning at step 1
    };
    return { ...card, srs: newSrs };
  }
}

/**
 * Retrieves all cards that are currently due for review, optionally scoped to specific decks.
 * @param {string[]} [deckIds] - Optional array of document IDs to scope the search.
 * @returns {Promise<Card[]>} A promise that resolves to an array of due `Card` objects.
 */
export async function getDueCards(deckIds?: string[]): Promise<Card[]> {
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
 * @returns {Promise<Map<string, { title: string; new: number; learning: number; due: number }>>}
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

    if (!srs || srs.repetitions === 0) {
      deckStat.new++;
    } else if (srs.learningStep > 0 && srs.dueDate <= now) {
      deckStat.learning++;
    } else if (srs.dueDate <= now) {
      deckStat.due++;
    }
  }

  return stats;
}

/**
 * Identifies the user's "weakest" cards, defined as those with the lowest ease factor.
 * @param {number} count The number of weakest cards to retrieve.
 * @returns {Promise<Card[]>} A promise that resolves to a list of the weakest cards.
 */
export async function getWeakestCards(count: number): Promise<Card[]> {
  const allCards = await cardService.getAllCards();

  const sortedCards = allCards.sort((a, b) => {
    const easeA = a.srs?.easeFactor ?? 2.5;
    const easeB = b.srs?.easeFactor ?? 2.5;
    return easeA - easeB;
  });

  return sortedCards.slice(0, count);
}

/**
 * Evaluates a user's typed answer against the correct answer and assigns a quality score.
 *
 * @param {string} userAnswer The answer typed by the user.
 * @param {string} correctAnswer The correct answer stored on the card.
 * @returns {Promise<ReviewQuality>} A promise that resolves to a `ReviewQuality` score.
 */
export async function evaluateAnswer(
  userAnswer: string,
  correctAnswer: string
): Promise<ReviewQuality> {
  const normalizedUserAnswer = userAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return 5; // Perfect recall -> Easy
  }

  return 0; // Incorrect -> Again
}
