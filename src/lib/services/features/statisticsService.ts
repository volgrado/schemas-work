/**
 * @file statisticsService.ts
 * @service
 * @description Provides business logic for generating study statistics and data visualizations.
 *
 * This service processes raw data from `reviewLogService` and `cardService` to derive
 * high-level insights, such as daily review counts, retention rates for different card
 * maturity levels, and the overall distribution of card statuses in the user's collection.
 */

import * as reviewLogService from './reviewLogService';
import * as cardService from './cardService';
import type { SRS } from '$lib/types';

// --- Constants ---
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MATURE_CARD_INTERVAL_DAYS = 21; // Standard Anki definition for a "mature" card

// =================================================================
// --- TYPE DEFINITIONS ---
// =================================================================

/** Data for the calendar heatmap component. */
export interface CalendarData {
  date: string; // YYYY-MM-DD format
  count: number;
}

/** Retention rates for mature vs. young cards. */
export interface RetentionData {
  /** Percentage of correct reviews for mature cards (interval >= 21 days). */
  mature: number;
  /** Percentage of correct reviews for young cards (interval < 21 days). */
  young: number;
  /** Overall percentage of correct reviews. */
  total: number;
}

/** The complete statistics payload for the main dashboard. */
export interface Statistics {
  totalReviews: number;
  reviewsToday: number;
  calendarHeatmap: CalendarData[];
  retention: RetentionData;
}

/** The distribution of cards across different learning stages. */
export interface CardStatusDistribution {
  new: number;
  learning: number;
  young: number;
  mature: number;
}

// =================================================================
// --- SERVICE FUNCTIONS ---
// =================================================================

/**
 * Generates comprehensive study statistics from all review logs and card data.
 * This is the primary function for populating the main statistics dashboard.
 * @returns {Promise<Statistics>} A promise that resolves to the complete statistics object.
 */
export async function generateStatistics(): Promise<Statistics> {
  const allLogs = await reviewLogService.getAllLogs();
  const allCards = await cardService.getAllCards();
  const cardMap = new Map(allCards.map((card) => [card.id, card]));

  // --- Basic Counts ---
  const totalReviews = allLogs.length;
  const oneDayAgo = Date.now() - ONE_DAY_MS;
  const reviewsToday = allLogs.filter(
    (log) => log.reviewTime > oneDayAgo
  ).length;

  // --- Calendar Heatmap Data ---
  const heatmap = new Map<string, number>();
  for (const log of allLogs) {
    const date = new Date(log.reviewTime).toISOString().split('T')[0];
    heatmap.set(date, (heatmap.get(date) || 0) + 1);
  }
  const calendarHeatmap: CalendarData[] = Array.from(
    heatmap,
    ([date, count]) => ({ date, count })
  );

  // --- Retention Rate Calculation ---
  let matureCorrect = 0,
    matureTotal = 0;
  let youngCorrect = 0,
    youngTotal = 0;

  for (const log of allLogs) {
    // Only calculate retention for 'review' state, not 'learn' or 'relearn'.
    if (log.state !== 'review') continue;

    const card = cardMap.get(log.cardId);
    if (!card || !card.srs) continue;

    const isCorrect = log.quality >= 3;
    const isMature = card.srs.interval >= MATURE_CARD_INTERVAL_DAYS;

    if (isMature) {
      matureTotal++;
      if (isCorrect) matureCorrect++;
    } else {
      youngTotal++;
      if (isCorrect) youngCorrect++;
    }
  }

  const retention: RetentionData = {
    mature: matureTotal > 0 ? (matureCorrect / matureTotal) * 100 : 0,
    young: youngTotal > 0 ? (youngCorrect / youngTotal) * 100 : 0,
    total:
      matureTotal + youngTotal > 0
        ? ((matureCorrect + youngCorrect) / (matureTotal + youngTotal)) * 100
        : 0,
  };

  return {
    totalReviews,
    reviewsToday,
    calendarHeatmap,
    retention,
  };
}

/**
 * Calculates the distribution of all cards across different SRS statuses.
 * @returns {Promise<CardStatusDistribution>} A promise that resolves to the distribution object.
 */
export async function getCardStatusDistribution(): Promise<CardStatusDistribution> {
  const allCards = await cardService.getAllCards();
  const distribution: CardStatusDistribution = {
    new: 0,
    learning: 0,
    young: 0,
    mature: 0,
  };

  for (const card of allCards) {
    if (card.suspended) continue;

    const srs = card.srs;

    if (!srs || srs.repetitions === 0) {
      distribution.new++;
    } else if (srs.learningStep > 0) {
      distribution.learning++;
    } else if (srs.interval >= MATURE_CARD_INTERVAL_DAYS) {
      distribution.mature++;
    } else {
      distribution.young++;
    }
  }

  return distribution;
}
