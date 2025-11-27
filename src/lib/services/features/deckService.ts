/**
 * @file Manages the settings and options for individual study decks.
 * @module deckService
 *
 * @remarks
 * This service provides a persistence layer for `DeckOptions`, which are the user-configurable
 * parameters for the spaced repetition algorithm applied to a specific deck (a "deck" is
 * conceptually equivalent to a schema document).
 *
 * It uses Dexie.js to manage an IndexedDB table (`deckOptions`) where each entry is keyed
 * by the `deckId` (which is the same as the `docId`). This allows for per-deck customization
 * of the learning experience.
 */
import Dexie, { type Table } from 'dexie';
import * as errorService from '$lib/core/services/errorService';

/**
 * @interface DeckOptions
 * Defines the user-configurable settings for a study deck.
 */
export interface DeckOptions {
  deckId: string; // Primary key (corresponds to docId)
  maxNewCardsPerDay: number;
  maxReviewsPerDay: number;
  learningSteps: string; // e.g., "1m 10m 1d"
  graduatingInterval: number; // in days
}

class DeckDB extends Dexie {
  deckOptions!: Table<DeckOptions>;

  constructor() {
    super('DeckDatabase');
    this.version(1).stores({
      deckOptions: 'deckId', // deckId is the primary key
    });
  }
}

const db = new DeckDB();

/**
 * @const {Omit<DeckOptions, 'deckId'>} defaultDeckOptions
 * The default settings for a new deck. These values are used when no specific
 * options have been saved for a given deckId.
 */
export const defaultDeckOptions: Omit<DeckOptions, 'deckId'> = {
  maxNewCardsPerDay: 20,
  maxReviewsPerDay: 100,
  learningSteps: '1m 10m', // Default: 1 minute, then 10 minutes
  graduatingInterval: 1, // 1 day
};

/**
 * Retrieves the options for a specific deck, returning defaults if none are set.
 * @param deckId The ID of the deck (docId).
 */
export async function getDeckOptions(deckId: string): Promise<DeckOptions> {
  try {
    const options = await db.deckOptions.get(deckId);
    // Important: Merge defaults with saved options to handle future additions to defaultDeckOptions
    return options
      ? { ...defaultDeckOptions, ...options, deckId }
      : { deckId, ...defaultDeckOptions };
  } catch (error) {
    errorService.reportError(error, { operation: 'getDeckOptions', deckId });
    return { deckId, ...defaultDeckOptions };
  }
}

/**
 * Saves the options for a specific deck.
 * @param options The DeckOptions object to save.
 */
export async function saveDeckOptions(options: DeckOptions): Promise<void> {
  try {
    await db.deckOptions.put(options);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'saveDeckOptions',
      deckId: options.deckId,
    });
    throw error;
  }
}
