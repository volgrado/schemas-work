// src/lib/services/features/reviewLogService.ts
import Dexie, { type Table } from 'dexie';
import type { ReviewQuality } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';

export interface ReviewLog {
  id?: number; // Auto-incrementing primary key
  cardId: string;
  deckId: string;
  reviewTime: number; // timestamp
  quality: ReviewQuality;
  newEase: number;
  newInterval: number; // in days
  state: 'learn' | 'review' | 'relearn'; // The state of the card when reviewed
}

class LogDB extends Dexie {
  reviewLogs!: Table<ReviewLog>;

  constructor() {
    super('ReviewLogDatabase');
    this.version(1).stores({
      reviewLogs: '++id, cardId, deckId, reviewTime',
    });
  }
}

const db = new LogDB();

/**
 * Adds a new review log entry to the database.
 * @param log The log entry to save.
 */
export async function logReview(log: Omit<ReviewLog, 'id'>): Promise<void> {
  try {
    await db.reviewLogs.add(log);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'logReview',
      cardId: log.cardId,
    });
    // We don't re-throw here because failing to log a review
    // should not interrupt the user's review session.
  }
}

/**
 * Retrieves all review logs from the database.
 * @returns A promise that resolves to an array of all review logs.
 */
export async function getAllLogs(): Promise<ReviewLog[]> {
  try {
    return await db.reviewLogs.toArray();
  } catch (error) {
    errorService.reportError(error, { operation: 'getAllLogs' });
    return [];
  }
}
