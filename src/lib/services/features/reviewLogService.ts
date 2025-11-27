/**
 * @file Manages the storage and retrieval of study session review logs.
 * @module reviewLogService
 *
 * @remarks
 * This service provides a persistence layer for `ReviewLog` objects. Every time a user
 * reviews a flashcard, a log entry is created to record the details of that interaction.
 * This data is crucial for tracking study history, calculating statistics, and visualizing
 * the user's progress.
 *
 * It uses Dexie.js to manage an IndexedDB database, ensuring all study data is stored
 * locally and available offline.
 */
import Dexie, { type Table } from 'dexie';
// REFINEMENT: Import the SRS namespace for the ReviewQuality type.
import type { SRS } from '$lib/types';
import * as errorService from '$lib/core/services/errorService';

/**
 * @interface ReviewLog
 * Defines the structure of a single review log entry.
 */
export interface ReviewLog {
  /** Auto-incrementing primary key */
  id?: number;
  /** The ID of the card that was reviewed. */
  cardId: string;
  /** The ID of the deck the card belongs to. */
  deckId: string;
  /** The timestamp of when the review occurred. */
  reviewTime: number;
  /** The user's self-assessed quality of the review (0-5). */
  // REFINEMENT: Use the namespaced SRS.ReviewQuality type.
  quality: SRS.ReviewQuality;
  /** The new ease factor of the card after this review. */
  newEase: number;
  /** The new interval (in days) before the card is due again. */
  newInterval: number;
  /** The state of the card when it was reviewed. */
  state: 'learn' | 'review' | 'relearn';
}

class LogDB extends Dexie {
  reviewLogs!: Table<ReviewLog>;

  constructor() {
    super('ReviewLogDatabase');
    this.version(1).stores({
      reviewLogs: '++id, cardId, deckId, reviewTime', // Define indexes for efficient querying
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
    // Failing to log a review should not interrupt the user's session.
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
    return []; // Return empty array on failure to prevent downstream crashes.
  }
}
