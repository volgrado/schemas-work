/**
 * @file cardService.ts
 * @service
 *
 * @description
 * This service manages the persistence and lifecycle of all study cards using a local
 * IndexedDB database via the Dexie.js library. It provides a robust, fully-typed API
 * for all CRUD operations and correctly handles Svelte 5 Proxy objects passed from the UI.
 */

import type { SRS } from '$lib/types';
import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';

class CardDB extends Dexie {
  cards!: Table<SRS.Card>;

  constructor() {
    super('CardDatabase');
    this.version(1).stores({
      cards: '++id, deckId',
    });
  }
}

const db = new CardDB();

/**
 * Creates a fully-typed Card object from a NewCard object and a deckId.
 * @internal
 */
function createCard(deckId: string, card: SRS.NewCard): SRS.Card {
  const id = uuidv4();

  // CORRECTION: Spread the incoming `card.srs` object first, then provide the
  // defaults. This ensures that defaults are only applied if they don't already exist.
  const baseSrs: SRS.Data = {
    ...(card.srs || {}),
    easeFactor: card.srs?.easeFactor ?? 2.5,
    interval: card.srs?.interval ?? 0,
    repetitions: card.srs?.repetitions ?? 0,
    dueDate: card.srs?.dueDate ?? Date.now(),
    learningStep: 1, // Always start in the learning step for a new card.
  };

  switch (card.type) {
    case 'basic':
      return {
        id,
        deckId,
        type: 'basic',
        content: card.content,
        srs: baseSrs,
        tags: [],
        suspended: false,
      };
    case 'input':
      return {
        id,
        deckId,
        type: 'input',
        content: card.content,
        srs: baseSrs,
        tags: [],
        suspended: false,
      };
    case 'sequencing':
      return {
        id,
        deckId,
        type: 'sequencing',
        content: card.content,
        srs: baseSrs,
        tags: [],
        suspended: false,
      };
    default:
      const _exhaustiveCheck: never = card;
      throw new Error(`Unhandled card type: ${(_exhaustiveCheck as any).type}`);
  }
}

/** Retrieves all cards from the database. */
export async function getAllCards(): Promise<SRS.Card[]> {
  try {
    return await db.cards.toArray();
  } catch (error) {
    errorService.reportError(error, { operation: 'getAllCards' });
    return [];
  }
}

/** Retrieves all cards associated with a specific deck ID. */
export async function getCardsByDeckId(deckId: string): Promise<SRS.Card[]> {
  try {
    return await db.cards.where('deckId').equals(deckId).toArray();
  } catch (error) {
    errorService.reportError(error, { operation: 'getCardsByDeckId', deckId });
    return [];
  }
}

/** Retrieves all cards for multiple deck IDs in a single query. */
export async function getCardsByDeckIds(
  deckIds: string[]
): Promise<SRS.Card[]> {
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

/** Adds a single new card to the database. */
export async function addCard(
  deckId: string,
  card: SRS.NewCard
): Promise<SRS.Card> {
  try {
    const plainCard = JSON.parse(JSON.stringify(card));
    const newCard = createCard(deckId, plainCard);
    await db.cards.add(newCard);
    return newCard;
  } catch (error) {
    errorService.reportError(error, { operation: 'addCard', deckId });
    throw error;
  }
}

/** Adds multiple cards for a specific deck in a single, efficient transaction. */
export async function addCards(
  deckId: string,
  cards: SRS.NewCard[]
): Promise<void> {
  try {
    const plainCards = JSON.parse(JSON.stringify(cards));
    const newCards = plainCards.map((card: SRS.NewCard) =>
      createCard(deckId, card)
    );
    await db.cards.bulkAdd(newCards);
  } catch (error) {
    errorService.reportError(error, { operation: 'addCards', deckId });
    throw error;
  }
}

/** Updates an existing card in the database. */
export async function updateCard(card: SRS.Card): Promise<void> {
  try {
    const plainCard = JSON.parse(JSON.stringify(card));
    await db.cards.put(plainCard);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'updateCard',
      cardId: card.id,
    });
    throw error;
  }
}

/** Deletes a card from the database by its unique identifier. */
export async function deleteCard(cardId: string): Promise<void> {
  try {
    await db.cards.delete(cardId);
  } catch (error) {
    errorService.reportError(error, { operation: 'deleteCard', cardId });
    throw error;
  }
}
