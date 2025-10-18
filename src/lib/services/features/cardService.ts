/**
 * @file Manages the persistence and lifecycle of "cards" using a local IndexedDB database.
 * @module cardService
 */

import type { Card, NewCard } from '$lib/types';

import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';

/**
 * Defines the IndexedDB database schema for storing cards.
 */
class CardDB extends Dexie {
  cards!: Table<Card>;

  constructor() {
    super('CardDatabase');
    this.version(1).stores({
      cards: '++id, nodeId',
    });
  }
}

const db = new CardDB();

/**
 * Helper: Create a fully-typed card from a NewCard + nodeId.
 */
function createCard(nodeId: string, card: NewCard): Card {
  const id = uuidv4();

  switch (card.type) {
    case 'basic':
      return {
        id,
        nodeId,
        type: 'basic',
        content: card.content, // { question, answer }
        srs: card.srs,
      };
    case 'input':
      return {
        id,
        nodeId,
        type: 'input',
        content: card.content, // { prompt, expected }
        srs: card.srs,
      };
    case 'sequencing':
      return {
        id,
        nodeId,
        type: 'sequencing',
        content: card.content, // { prompt, items }
        srs: card.srs,
      };
    default:
      const _exhaustiveCheck: never = card;
      throw new Error(`Unhandled card type: ${_exhaustiveCheck}`);
  }
}

/**
 * Retrieves all cards from the database.
 * @returns {Promise<Card[]>}
 */
export async function getAllCards(): Promise<Card[]> {
  try {
    return await db.cards.toArray();
  } catch (error) {
    errorService.reportError(error, { operation: 'getAllCards' });
    return [];
  }
}

/**
 * Retrieves all cards associated with a specific schema node ID.
 * @param nodeId - The unique identifier of the schema node.
 */
export async function getCardsByNodeId(nodeId: string): Promise<Card[]> {
  try {
    return await db.cards.where('nodeId').equals(nodeId).toArray();
  } catch (error) {
    errorService.reportError(error, { operation: 'getCardsByNodeId', nodeId });
    return [];
  }
}

/**
 * Adds a single new card to the database.
 * @param nodeId - The ID of the node to associate the card with.
 * @param card - The card data to add.
 * @returns {Promise<Card>} - The newly created card.
 */
export async function addCard(nodeId: string, card: NewCard): Promise<Card> {
  const newCard = createCard(nodeId, card);
  try {
    await db.cards.add(newCard);
    return newCard;
  } catch (error) {
    errorService.reportError(error, { operation: 'addCard', nodeId });
    throw error;
  }
}

/**
 * Adds multiple cards for a specific node in a single transaction.
 * @param nodeId - The ID of the node to associate the cards with.
 * @param cards - An array of card data to add.
 */
export async function addCards(
  nodeId: string,
  cards: NewCard[]
): Promise<void> {
  const newCards = cards.map((card) => createCard(nodeId, card));
  try {
    await db.cards.bulkAdd(newCards);
  } catch (error) {
    errorService.reportError(error, { operation: 'addCards', nodeId });
    throw error;
  }
}

/**
 * Updates an existing card or creates it if it doesn't exist (upsert).
 * @param card - The card object to update or create.
 */
export async function updateCard(card: Card): Promise<void> {
  try {
    await db.cards.put(card);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'updateCard',
      cardId: card.id,
    });
    throw error;
  }
}

/**
 * Deletes a card from the database by its unique identifier.
 * @param cardId - The ID of the card to delete.
 */
export async function deleteCard(cardId: string): Promise<void> {
  try {
    await db.cards.delete(cardId);
  } catch (error) {
    errorService.reportError(error, { operation: 'deleteCard', cardId });
    throw error;
  }
}
