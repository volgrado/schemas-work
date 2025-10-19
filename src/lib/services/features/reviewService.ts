/**
 * @file Implements the business logic for the spaced repetition learning (SRS) feature.
 * @module reviewService
 *
 * @remarks
 * This service is the core of the spaced repetition system. It uses a modified SM-2
 * algorithm to calculate the optimal time to present a card for review again, aiming
 * to maximize learning and retention. The service is responsible for calculating review
 * schedules, identifying due cards, and finding the user's weakest cards.
 */

import type { Card, ReviewQuality, SrsData } from '$lib/types';
import * as cardService from '$lib/services/features/cardService';
import * as directoryService from '$lib/services/core/directoryService'; // Add this import

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the next review state for a card using a modified SM-2 algorithm.
 *
 * @param {Card} card The card that was just reviewed.
 * @param {ReviewQuality} quality A numeric score (0-5) representing the user's recall quality.
 * @returns {Card} A new `Card` object with updated SRS data.
 */
export function calculateNextReview(card: Card, quality: ReviewQuality): Card {
  const srsData = card.srs || {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    dueDate: 0,
  };

  if (quality < 3) {
    const newSrs: SrsData = {
      repetitions: 0,
      interval: 1,
      easeFactor: Math.max(1.3, srsData.easeFactor - 0.2),
      dueDate: Date.now() + ONE_DAY_MS,
    };
    return { ...card, srs: newSrs };
  }

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

  const newEaseFactor =
    srsData.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  const finalSrs: SrsData = {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Math.max(1.3, newEaseFactor),
    dueDate: Date.now() + newInterval * ONE_DAY_MS,
  };

  return { ...card, srs: finalSrs };
}

/**
 * Retrieves all cards that are currently due for review, optionally scoped to specific decks.
 * @param {string[]} [deckIds] - Optional array of document IDs to scope the search.
 * @returns {Promise<Card[]>} A promise that resolves to an array of due `Card` objects.
 */
export async function getDueCards(deckIds?: string[]): Promise<Card[]> {
  const allCards = deckIds
    ? await cardService.getCardsByNodeIds(deckIds)
    : await cardService.getAllCards();

  const now = Date.now();

  return allCards.filter(
    (card) =>
      !card.suspended &&
      (!card.srs || !card.srs.dueDate || card.srs.dueDate <= now)
  );
}

/**
 * Gathers statistics (due count, new count) for all documents that contain cards.
 * @returns {Promise<Map<string, { title: string; due: number; new: number }>>}
 */
export async function getAllDeckStats(): Promise<
  Map<string, { title: string; due: number; new: number }>
> {
  const allDocs = await directoryService.getAllItems();
  const allCards = await cardService.getAllCards();
  const now = Date.now();

  const stats = new Map<string, { title: string; due: number; new: number }>();

  // Create a map for quick document title lookup
  const docTitleMap = new Map(allDocs.map((doc) => [doc.id, doc.title]));

  for (const card of allCards) {
    if (!stats.has(card.nodeId)) {
      stats.set(card.nodeId, {
        title: docTitleMap.get(card.nodeId) || 'Untitled',
        due: 0,
        new: 0,
      });
    }

    const deckStat = stats.get(card.nodeId)!;

    if (!card.suspended) {
      // A card is "new" if it has 0 repetitions.
      if (!card.srs || card.srs.repetitions === 0) {
        deckStat.new++;
      }
      // A card is "due" if its due date is in the past. New cards are also due.
      if (!card.srs || !card.srs.dueDate || card.srs.dueDate <= now) {
        deckStat.due++;
      }
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
    return 5; // Perfect recall
  }

  return 0; // Incorrect
}
