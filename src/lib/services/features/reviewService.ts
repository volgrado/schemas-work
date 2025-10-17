/**
 * @file Implements the business logic for the spaced repetition learning (SRS) feature.
 *
 * @remarks
 * This service is the core of the spaced repetition system. It is responsible for managing
 * the entire review lifecycle of study cards, aiming to optimize learning and retention.
 * It uses a variation of the well-regarded SM-2 algorithm, a popular SRS, to calculate
 * the optimal time to present a card for review again. The fundamental principle is to
 * show the user a card just before they are likely to forget it, thereby maximizing the
 * efficiency of the learning process.
 *
 * The key responsibilities of this service include:
 * - Calculating the next review date for a card based on the user's self-assessed
 *   performance (`calculateNextReview`).
 * - Identifying which cards are currently due for review (`getDueCards`).
 * - Finding the cards that the user struggles with the most, based on their review
 *   history (`getWeakestCards`).
 */

import type { Card, ReviewQuality, SrsData } from '$lib/types';
import * as cardService from '$lib/services/features/cardService';

// A constant representing one day in milliseconds, used for date arithmetic.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the next review state for a card using a modified SM-2 algorithm.
 *
 * @param card The card that was just reviewed by the user.
 * @param quality A numeric score from 0 to 5 representing the user's recall quality:
 *                - 0: Complete blackout (forgot completely).
 *                - 1: Incorrect, but the correct answer seemed familiar.
 *                - 2: Incorrect, but the correct answer was easy to produce once revealed.
 *                - 3: Correct, but with significant difficulty.
 *                - 4: Correct, but with some hesitation.
 *                - 5: Correct, perfect and immediate recall.
 * @returns A new `Card` object with updated SRS data (`repetitions`, `interval`, `easeFactor`, `dueDate`).
 */
export function calculateNextReview(card: Card, quality: ReviewQuality): Card {
  // Initialize with default SRS data if this is the card's first review.
  const srsData = card.srs || {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5, // The neutral starting ease factor.
    dueDate: 0,
  };

  // If the answer was incorrect (quality < 3), reset the learning interval and decrease the ease factor.
  if (quality < 3) {
    const newSrs: SrsData = {
      repetitions: 0, // Reset the repetition count to re-learn the card.
      interval: 1, // Show the card again tomorrow.
      easeFactor: Math.max(1.3, srsData.easeFactor - 0.2), // Decrease ease, but not below the minimum of 1.3.
      dueDate: Date.now() + ONE_DAY_MS,
    };
    return { ...card, srs: newSrs };
  }

  // If the answer was correct (quality >= 3), calculate the new, longer interval.
  let newInterval: number;
  let newRepetitions: number;

  if (srsData.repetitions === 0) {
    newInterval = 1; // First successful repetition: review again tomorrow.
    newRepetitions = 1;
  } else if (srsData.repetitions === 1) {
    newInterval = 6; // Second successful repetition: jump to 6 days.
    newRepetitions = 2;
  } else {
    // For all subsequent repetitions, use the core SRS formula.
    newInterval = Math.round(srsData.interval * srsData.easeFactor);
    newRepetitions = srsData.repetitions + 1;
  }

  // Update the ease factor based on performance (how easy was it to recall?).
  const newEaseFactor =
    srsData.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  const finalSrs: SrsData = {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Math.max(1.3, newEaseFactor), // Ensure the ease factor doesn't fall below the minimum threshold.
    dueDate: Date.now() + newInterval * ONE_DAY_MS, // Set the next due date.
  };

  return { ...card, srs: finalSrs };
}

/**
 * Retrieves all cards from the database that are currently due for review.
 *
 * @returns A promise that resolves to an array of `Card` objects where the `dueDate` is in the past.
 */
export async function getDueCards(): Promise<Card[]> {
  const allCards = await cardService.getAllCards();
  const now = Date.now();

  // A card is considered due if it has no SRS data (i.e., it's new) or if its due date has passed.
  return allCards.filter(
    (card) => !card.srs || !card.srs.dueDate || card.srs.dueDate <= now,
  );
}

/**
 * Identifies the user's "weakest" cards, defined as those with the lowest ease factor.
 *
 * @remarks
 * This is particularly useful for creating targeted study sessions, allowing the user to focus
 * on the concepts they find most difficult to remember.
 *
 * @param count The number of weakest cards to retrieve.
 * @returns A promise that resolves to a list of the `count` cards with the lowest ease factors.
 */
export async function getWeakestCards(count: number): Promise<Card[]> {
  const allCards = await cardService.getAllCards();

  // Sort cards by their ease factor in ascending order (lowest ease factor = hardest card).
  const sortedCards = allCards.sort((a, b) => {
    const easeA = a.srs?.easeFactor ?? 2.5; // Use a neutral default for cards that have never been reviewed.
    const easeB = b.srs?.easeFactor ?? 2.5;
    return easeA - easeB;
  });

  return sortedCards.slice(0, count);
}

/**
 * Evaluates a user's typed answer against the correct answer and assigns a quality score.
 *
 * @remarks
 * **This function is a placeholder.** The current implementation performs a simple,
 * case-insensitive string comparison. In a future, more advanced version, this could be
 * replaced with a sophisticated natural language processing (NLP) model. Such a model
 * could use sentence embeddings or other techniques to gauge the semantic similarity
 * between the user's answer and the correct one, allowing for more nuanced feedback.
 *
 * @param userAnswer The answer as typed by the user.
 * @param correctAnswer The correct answer stored on the card.
 * @returns A promise that resolves to a `ReviewQuality` score (currently either 1 for incorrect or 5 for perfect).
 */
export async function evaluateAnswer(
  userAnswer: string,
  correctAnswer: string,
): Promise<ReviewQuality> {
  const normalizedUserAnswer = userAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

  // TODO: Replace this simplistic logic with a call to a real NLP model for semantic comparison.
  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return 5; // Perfect recall
  }

  // In a future implementation, this could return more granular scores:
  // - return 4 if the answer is very close (e.g., a minor typo)
  // - return 3 if it captures the main idea but is poorly phrased
  // - return 2 if it's only partially correct
  // For now, any non-perfect match is considered incorrect.
  return 1; // Incorrect
}
