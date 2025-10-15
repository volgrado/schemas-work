// src/lib/services/features/cardService.ts

import type { Card } from '$lib/types';
import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';

/**
 * Defines the database schema using Dexie.
 */
class CardDB extends Dexie {
  cards!: Table<Card>;

  constructor() {
    super('CardDatabase');
    this.version(1).stores({
      cards: '++id, nodeId', // Primary key 'id', index on 'nodeId'
    });
  }
}

const db = new CardDB();

/**
 * Retrieves all cards from the database.
 * @returns A promise that resolves to an array of all cards.
 */
export async function getAllCards(): Promise<Card[]> {
  try {
    return await db.cards.toArray();
  } catch (error) {
    errorService.reportError(error, {
      operation: 'getAllCards',
    });
    return [];
  }
}

/**
 * Retrieves all cards associated with a specific node ID.
 * @param nodeId The ID of the node.
 * @returns A promise that resolves to an array of cards.
 */
export async function getCardsByNodeId(nodeId: string): Promise<Card[]> {
  try {
    return await db.cards.where('nodeId').equals(nodeId).toArray();
  } catch (error) {
    errorService.reportError(error, {
      operation: 'getCardsByNodeId',
      nodeId,
    });
    return [];
  }
}

/**
 * Adds a single new card to the database.
 * @param nodeId The ID of the node this card belongs to.
 * @param card The card data to add (without id).
 * @returns The newly created card with its ID.
 */
export async function addCard(
  nodeId: string,
  card: Omit<Card, 'id' | 'nodeId'>
): Promise<Card> {
  const newCard = {
    ...card,
    id: uuidv4(),
    nodeId: nodeId,
  } as Card; // Assert the final object shape
  await db.cards.add(newCard);
  return newCard;
}

/**
 * Adds multiple cards to the database for a specific node in a single transaction.
 * @param nodeId The ID of the node these cards belong to.
 * @param cards An array of card data to add.
 * @returns A promise that resolves when the operation is complete.
 */
export async function addCards(
  nodeId: string,
  cards: Omit<Card, 'id' | 'nodeId'>[]
): Promise<void> {
  const newCards: Card[] = cards.map(
    (card) =>
      ({
        ...card,
        id: uuidv4(),
        nodeId: nodeId,
      }) as Card
  ); // Assert each created object
  await db.cards.bulkAdd(newCards);
}

/**
 * Updates an existing card in the database.
 * @param card The card with updated data.
 */
export async function updateCard(card: Card): Promise<void> {
  await db.cards.put(card);
}

/**
 * Deletes a card from the database by its ID.
 * @param cardId The ID of the card to delete.
 */
export async function deleteCard(cardId: string): Promise<void> {
  await db.cards.delete(cardId);
}
