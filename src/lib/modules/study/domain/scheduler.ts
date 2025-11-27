/**
 * @file scheduler.ts
 * @module study.domain
 * @description
 * Pure domain logic for the Spaced Repetition System (SRS).
 * Implements a robust state machine and scheduling algorithm (Modified SM-2).
 *
 * States:
 * - New: repetitions === 0 && learningStep === 0
 * - Learning: learningStep > 0
 * - Review: repetitions > 0 && learningStep === 0
 * - Relearning: repetitions > 0 && learningStep > 0
 */

import type { SRS } from '$lib/types';
import type { DeckOptions } from './deckService';
import { parseTime } from '$lib/core/utils/time';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * Determines the current state of a card based on its SRS data.
 */
export function getCardState(card: SRS.Card): CardState {
  const srs = card.srs;
  if (!srs) return 'new';

  if (srs.learningStep > 0) {
    return srs.repetitions > 0 ? 'relearning' : 'learning';
  }

  return srs.repetitions > 0 ? 'review' : 'new';
}

/**
 * Calculates the next review schedule for a card.
 */
export function calculateNextReview(
  card: SRS.Card,
  quality: SRS.ReviewQuality,
  options: Omit<DeckOptions, 'deckId'>
): SRS.Card {
  const srs = card.srs || {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    dueDate: 0,
    learningStep: 0,
  };

  const state = getCardState({ ...card, srs });
  const learningStepsMs = options.learningSteps.split(' ').map(parseTime);

  // --- Logic for Learning / Relearning / New ---
  if (state === 'new' || state === 'learning' || state === 'relearning') {
    if (quality >= 3) {
      // "Good" or "Easy" -> Advance step
      const currentStepIndex = Math.max(0, srs.learningStep - 1);

      if (currentStepIndex < learningStepsMs.length - 1) {
        // Advance to next learning step
        return {
          ...card,
          srs: {
            ...srs,
            learningStep: srs.learningStep + 1,
            dueDate: Date.now() + learningStepsMs[srs.learningStep], // Use next step interval
          },
        };
      } else {
        // Graduate
        const graduatingInterval =
          state === 'relearning'
            ? Math.max(1, options.graduatingInterval) // Relearning might have different logic, but using graduating for now
            : options.graduatingInterval;

        return {
          ...card,
          srs: {
            ...srs,
            learningStep: 0, // Exit learning
            interval: graduatingInterval,
            dueDate: Date.now() + graduatingInterval * ONE_DAY_MS,
            repetitions: srs.repetitions === 0 ? 1 : srs.repetitions + 1,
          },
        };
      }
    } else {
      // "Again" -> Reset to first step
      return {
        ...card,
        srs: {
          ...srs,
          learningStep: 1, // First step
          dueDate: Date.now() + learningStepsMs[0],
          // Don't reset repetitions if relearning, to keep track of history?
          // Standard Anki behavior for lapses: reset interval, keep ease (mostly).
          // We'll keep repetitions to distinguish 'relearning' from 'learning'.
        },
      };
    }
  }

  // --- Logic for Review (Graduated) ---
  if (state === 'review') {
    if (quality >= 3) {
      // Success
      let newInterval: number;
      
      // SM-2 inspired calculation
      if (srs.repetitions === 1) {
         newInterval = 6; // Hardcoded jump for second rep usually
      } else {
         newInterval = Math.round(srs.interval * srs.easeFactor);
      }
      
      // Easy bonus?
      if (quality === 5) {
        newInterval = Math.round(newInterval * 1.3);
      }

      // Adjust Ease
      // EF' = EF + (0.1 - (5-q)*(0.08+(5-q)*0.02))
      const newEaseFactor =
        srs.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

      return {
        ...card,
        srs: {
          ...srs,
          repetitions: srs.repetitions + 1,
          interval: newInterval,
          easeFactor: Math.max(1.3, newEaseFactor),
          dueDate: Date.now() + newInterval * ONE_DAY_MS,
          learningStep: 0,
        },
      };
    } else {
      // Lapse (Fail in Review) -> Enter Relearning
      // Reduce Ease
      const newEaseFactor = Math.max(1.3, srs.easeFactor - 0.2);
      
      return {
        ...card,
        srs: {
          ...srs,
          learningStep: 1, // Enter learning at step 1
          interval: 1, // Reset interval (or percentage of old interval)
          easeFactor: newEaseFactor,
          dueDate: Date.now() + learningStepsMs[0],
        },
      };
    }
  }

  return card;
}
