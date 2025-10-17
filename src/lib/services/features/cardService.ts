/**
 * @file Manages the persistence and lifecycle of "cards" using a local IndexedDB database.
 *
 * @remarks
 * This service provides a straightforward and robust CRUD (Create, Read, Update, Delete)
 * interface for managing `Card` objects. Cards represent supplementary, structured pieces
 * of information that can be linked to specific nodes within a larger schema document.
 *
 * The service leverages `Dexie.js`, a powerful and developer-friendly wrapper around the
 * native `IndexedDB` API. This choice allows for efficient, transactional, and indexed
 * local storage. Decoupling card storage from the main document persistence layer
 * (`y-indexeddb`) is a deliberate design choice, making it highly suitable for storing
 * metadata, annotations, or other transient, view-specific state that doesn't need to
 * be part of the collaborative, versioned document history.
 */

import type { Card } from '$lib/types';
import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';

/**
 * Defines the IndexedDB database schema for storing cards using the Dexie ORM.
 * @internal
 */
class CardDB extends Dexie {
  /** The Dexie table that will store the `Card` objects. */
  cards!: Table<Card>;

  constructor() {
    // The database name must be unique across the application's domain.
    super('CardDatabase');
    this.version(1).stores({
      // Defines the schema for version 1 of the database.
      // '++id' specifies an auto-incrementing primary key named 'id'.
      // 'nodeId' creates an index on the `nodeId` property for fast lookups.
      cards: '++id, nodeId',
    });
  }
}

// A singleton instance of the database is created to be shared across the application.
const db = new CardDB();

/**
 * Retrieves all cards currently stored in the database.
 * @returns A promise that resolves to an array of all `Card` objects. Returns an empty array in case of an error.
 */
export async function getAllCards(): Promise<Card[]> {
  try {
    return await db.cards.toArray();
  } catch (error) {
    errorService.reportError(error, { operation: 'getAllCards' });
    return []; // Return a safe, empty value on failure.
  }
}

/**
 * Retrieves all cards that are associated with a specific schema node ID.
 * @param nodeId The unique identifier of the node whose cards are to be fetched.
 * @returns A promise that resolves to an array of matching `Card` objects. Returns an empty array on error.
 */
export async function getCardsByNodeId(nodeId: string): Promise<Card[]> {
  try {
    // The `where()` clause uses the 'nodeId' index for efficient querying.
    return await db.cards.where('nodeId').equals(nodeId).toArray();
  } catch (error) {
    errorService.reportError(error, { operation: 'getCardsByNodeId', nodeId });
    return [];
  }
}

/**
 * Adds a single new card to the database.
 * @param nodeId The ID of the node to which this card should be associated.
 * @param card The card data to add. The `id` property will be automatically generated.
 * @returns The newly created card, now including its unique, generated `id`.
 */
export async function addCard(nodeId: string, card: Omit<Card, 'id' | 'nodeId'>): Promise<Card> {
  const newCard: Card = {
    ...card,
    id: uuidv4(), // Generate a new, universally unique identifier for the card.
    nodeId: nodeId,
  };
  await db.cards.add(newCard);
  return newCard;
}

/**
 * Adds multiple cards for a specific node in a single, efficient database transaction.
 * @param nodeId The ID of the node to which these cards should be associated.
 * @param cards An array of card data to add.
 */
export async function addCards(nodeId: string, cards: Omit<Card, 'id' | 'nodeId'>[]): Promise<void> {
  const newCards: Card[] = cards.map((card) => ({
    ...card,
    id: uuidv4(),
    nodeId: nodeId,
  }));
  // Dexie's `bulkAdd` is significantly more performant for multiple additions than calling `add()` in a loop.
  await db.cards.bulkAdd(newCards);
}

/**
 * Updates an existing card in the database. If the card does not exist, it will be created.
 * @param card The card object containing the updated data. It must have a valid `id`.
 */
export async function updateCard(card: Card): Promise<void> {
  // Dexie's `put` method handles both creating and updating, based on the primary key.
  await db.cards.put(card);
}

/**
 * Deletes a card from the database by its unique identifier.
 * @param cardId The ID of the card to be deleted.
 */
export async function deleteCard(cardId: string): Promise<void> {
  await db.cards.delete(cardId);
}
