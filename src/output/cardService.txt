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
      cards: '++id, deckId', // MODIFIED: Index by deckId instead of nodeId
    });
  }
}

const db = new CardDB();

/**
 * Creates a fully-typed card from a `NewCard` object and a `deckId`.
 * @param deckId - The ID of the deck to associate the card with.
 * @param card - The card data to add.
 * @returns {Card} - The newly created card.
 * @internal
 */
function createCard(deckId: string, card: NewCard): Card {
  const id = uuidv4();

  const baseSrs = {
    ...card.srs,
    learningStep: 1, // Start at step 1 of the learning phase
  };

  switch (card.type) {
    case 'basic':
      return {
        id,
        deckId,
        type: 'basic',
        content: card.content, // { question, answer }
        srs: baseSrs,
        tags: [],
        suspended: false,
      };
    case 'input':
      return {
        id,
        deckId,
        type: 'input',
        content: card.content, // { prompt, expected }
        srs: baseSrs,
        tags: [],
        suspended: false,
      };
    case 'sequencing':
      return {
        id,
        deckId,
        type: 'sequencing',
        content: card.content, // { prompt, items }
        srs: baseSrs,
        tags: [],
        suspended: false,
      };
    default:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
 * Retrieves all cards associated with a specific deck (document) ID.
 * @param deckId - The unique identifier of the deck.
 */
export async function getCardsByDeckId(deckId: string): Promise<Card[]> {
  try {
    return await db.cards.where('deckId').equals(deckId).toArray();
  } catch (error) {
    errorService.reportError(error, { operation: 'getCardsByDeckId', deckId });
    return [];
  }
}

/**
 * Retrieves all cards associated with an array of deck IDs.
 * @param deckIds - An array of unique identifiers of the decks.
 */
export async function getCardsByDeckIds(deckIds: string[]): Promise<Card[]> {
  if (deckIds.length === 0) return [];
  try {
    return await db.cards.where('deckId').anyOf(deckIds).toArray();
  } catch (error) {
    errorService.reportError(error, {
      operation: 'getCardsByDeckIds',
      deckIds,
    });
    return [];
  }
}

/**
 * Adds a single new card to the database.
 * @param deckId - The ID of the deck to associate the card with.
 * @param card - The card data to add.
 * @returns {Promise<Card>} - The newly created card.
 */
export async function addCard(deckId: string, card: NewCard): Promise<Card> {
  const newCard = createCard(deckId, card);
  try {
    await db.cards.add(newCard);
    return newCard;
  } catch (error) {
    errorService.reportError(error, { operation: 'addCard', deckId });
    throw error;
  }
}

/**
 * Adds multiple cards for a specific deck in a single transaction.
 * @param deckId - The ID of the deck to associate the cards with.
 * @param cards - An array of card data to add.
 */
export async function addCards(
  deckId: string,
  cards: NewCard[]
): Promise<void> {
  const newCards = cards.map((card) => createCard(deckId, card));
  try {
    await db.cards.bulkAdd(newCards);
  } catch (error) {
    errorService.reportError(error, { operation: 'addCards', deckId });
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
