import type { DomainCard } from '$lib/types';

/**
 * The quality of the user's response (0=fail, 3=hesitant, 5=perfect).
 */
type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * One day in milliseconds.
 */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the next state of a study card based on the quality of the response.
 * Implements a version of the SM-2 algorithm.
 * @param {DomainCard} card The card being reviewed.
 * @param {ReviewQuality} quality The quality of the user's response (0-5).
 * @returns {DomainCard} The card with its review data updated.
 */
export function calculateNextReview(
  card: DomainCard,
  quality: ReviewQuality,
): DomainCard {
  // 1. Provide default values for new cards
  const easeFactor = card.easeFactor ?? 2.5;
  const interval = card.interval ?? 0;
  const repetitions = card.repetitions ?? 0;

  // 2. If the answer is incorrect (quality < 3), reset progress
  if (quality < 3) {
    return {
      ...card,
      repetitions: 0,
      interval: 1,
      easeFactor: Math.max(1.3, easeFactor - 0.2), // Reduce ease but not below 1.3
      dueDate: Date.now() + ONE_DAY_MS,
    };
  }

  // 3. If the answer is correct (quality >= 3)
  let newInterval: number;
  let newRepetitions: number;

  if (repetitions === 0) {
    newInterval = 1;
    newRepetitions = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
    newRepetitions = 2;
  } else {
    newInterval = Math.round(interval * easeFactor);
    newRepetitions = repetitions + 1;
  }

  // 4. Calculate the new ease factor
  const newEaseFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // 5. Return the updated card
  return {
    ...card,
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Math.max(1.3, newEaseFactor), // Ease factor never goes below 1.3
    dueDate: Date.now() + newInterval * ONE_DAY_MS,
  };
}
