import type { Card, ReviewQuality, SrsData } from '$lib/types';
import * as cardService from '$lib/services/features/cardService';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the next state of a study card based on the quality of the response.
 * Implements a version of the SM-2 algorithm.
 * @param {Card} card The card being reviewed.
 * @param {ReviewQuality} quality The quality of the user's response (0-5).
 * @returns {Card} The card with its review data updated.
 */
export function calculateNextReview(card: Card, quality: ReviewQuality): Card {
  // 1. Provide default values for new cards or cards without SRS data
  const srsData = card.srs || {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    dueDate: 0,
  };

  // 2. If the answer is incorrect (quality < 3), reset progress
  if (quality < 3) {
    const newSrs: SrsData = {
      repetitions: 0,
      interval: 1,
      easeFactor: Math.max(1.3, srsData.easeFactor - 0.2), // Reduce ease but not below 1.3
      dueDate: Date.now() + ONE_DAY_MS,
    };
    return { ...card, srs: newSrs };
  }

  // 3. If the answer is correct (quality >= 3)
  let newInterval: number;
  let newRepetitions: number;

  if (srsData.repetitions === 0) {
    newInterval = 1;
    newRepetitions = 1;
  } else if (srsData.repetitions === 1) {
    newInterval = 6;
    newRepetitions = 2;
  } else {
    newInterval = Math.round(srsData.interval * srsData.easeFactor);
    newRepetitions = srsData.repetitions + 1;
  }

  // 4. Calculate the new ease factor
  const newEaseFactor =
    srsData.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // 5. Return the updated card with new SRS data
  const finalSrs: SrsData = {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Math.max(1.3, newEaseFactor), // Ease factor never goes below 1.3
    dueDate: Date.now() + newInterval * ONE_DAY_MS,
  };

  return { ...card, srs: finalSrs };
}

/**
 * Gets all cards that are due for review.
 * @returns {Promise<Card[]>} A promise that resolves to a list of due cards.
 */
export async function getDueCards(): Promise<Card[]> {
  const allCards = await cardService.getAllCards();
  const now = Date.now();
  // If a card has no SRS data or no due date, it's considered due.
  return allCards.filter(
    (card) => !card.srs || !card.srs.dueDate || card.srs.dueDate <= now
  );
}

/**
 * Gets the n weakest cards based on their ease factor.
 * @param {number} count The number of weakest cards to retrieve.
 * @returns {Promise<Card[]>} A promise that resolves to a list of the weakest cards.
 */
export async function getWeakestCards(count: number): Promise<Card[]> {
  const allCards = await cardService.getAllCards();

  // Sorts cards by ease factor, from lowest (hardest) to highest (easiest).
  // Cards without SRS data are given a default medium ease factor.
  const sortedCards = allCards.sort((a, b) => {
    const easeA = a.srs?.easeFactor ?? 2.5;
    const easeB = b.srs?.easeFactor ?? 2.5;
    return easeA - easeB;
  });

  return sortedCards.slice(0, count);
}
