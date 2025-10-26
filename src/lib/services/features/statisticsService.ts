/**
 * @file Calculates and aggregates study statistics from review logs and card data.
 * @module statisticsService
 */
import * as reviewLogService from '$lib/services/features/reviewLogService';
import * as cardService from '$lib/services/features/cardService';
import type { Card } from '$lib/types'; // Import your main Card type from your types file

// --- Type Definitions ---

export interface CalendarData {
  date: string; // YYYY-MM-DD format
  count: number;
}

export interface RetentionData {
  mature: number;
  young: number;
  total: number;
}

export interface Statistics {
  totalReviews: number;
  reviewsToday: number;
  calendarHeatmap: CalendarData[];
  retention: RetentionData;
}

export interface CardStatusDistribution {
  new: number;
  learning: number;
  young: number;
  mature: number;
}

// --- Service Functions ---

/**
 * Generates comprehensive study statistics from all review logs.
 * This function focuses on PAST performance and review history.
 */
export async function getStatistics(): Promise<Statistics> {
  const logs = await reviewLogService.getAllLogs();
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  // --- Total and Today's Reviews ---
  const totalReviews = logs.length;
  const reviewsToday = logs.filter(
    (log) => log.reviewTime >= todayStart
  ).length;

  // --- Calendar Heatmap Data ---
  const reviewsPerDay = new Map<string, number>();
  for (const log of logs) {
    const date = new Date(log.reviewTime).toISOString().split('T')[0];
    reviewsPerDay.set(date, (reviewsPerDay.get(date) || 0) + 1);
  }
  const calendarHeatmap = Array.from(reviewsPerDay.entries()).map(
    ([date, count]) => ({ date, count })
  );

  // --- Retention Rate ---
  const reviewLogs = logs.filter((log) => log.state === 'review');
  const retention: RetentionData = {
    mature: 0,
    young: 0,
    total: reviewLogs.length,
  };

  for (const log of reviewLogs) {
    if (log.newInterval > 21) {
      if (log.quality >= 3) retention.mature++;
    } else {
      if (log.quality >= 3) retention.young++;
    }
  }

  return {
    totalReviews,
    reviewsToday,
    calendarHeatmap,
    retention,
  };
}

/**
 * Calculates the distribution of cards by their CURRENT status.
 * This function is now corrected to work with your actual SrsData type,
 * where the state is derived from `learningStep` and `repetitions`.
 * @returns A promise that resolves to an object with counts for each card status.
 */
export async function getCardStatusDistribution(): Promise<CardStatusDistribution> {
  const allCards: Card[] = await cardService.getAllCards();

  const distribution: CardStatusDistribution = {
    new: 0,
    learning: 0,
    young: 0,
    mature: 0,
  };

  for (const card of allCards) {
    const srs = card.srs;

    // --- THIS IS THE CORRECTED LOGIC BASED ON YOUR types.ts ---
    if (srs.learningStep > 0) {
      // If the card is in a learning step, its state is 'learning'.
      distribution.learning++;
    } else if (srs.repetitions > 0) {
      // If it's graduated (learningStep is 0) and has been seen before, it's a 'review' card.
      // We then check its interval to distinguish between young and mature.
      // Anki's standard definition of a "mature" card is one with an interval >= 21 days.
      if (srs.interval >= 21) {
        distribution.mature++;
      } else {
        distribution.young++;
      }
    } else {
      // If it's not learning and has never been reviewed, it must be 'new'.
      distribution.new++;
    }
  }

  return distribution;
}
