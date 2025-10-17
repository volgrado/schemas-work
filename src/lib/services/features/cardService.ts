/**
 * @file Manages the persistence and lifecycle of "cards" using a local IndexedDB database.
 * @module cardService
 *
 * @remarks
 * This service provides a CRUD interface for managing `Card` objects, which are linked
 * to specific nodes within a schema document. It uses `Dexie.js` for efficient local
 * storage, decoupling card data from the main document's CRDT-based persistence.
 */

import type { Card } from '$lib/types';
import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';

/**
 * Defines the IndexedDB database schema for storing cards.
 * @internal
 */
class CardDB extends Dexie {
	/** The Dexie table that stores `Card` objects. */
	cards!: Table<Card>;

	constructor() {
		super('CardDatabase');
		this.version(1).stores({
			cards: '++id, nodeId'
		});
	}
}

/**
 * A singleton instance of the database.
 * @internal
 */
const db = new CardDB();

/**
 * Retrieves all cards from the database.
 * @returns {Promise<Card[]>} A promise that resolves to an array of all `Card` objects.
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
 * @param {string} nodeId The unique identifier of the schema node.
 * @returns {Promise<Card[]>} A promise that resolves to an array of matching `Card` objects.
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
 * @param {string} nodeId The ID of the node to associate the card with.
 * @param {Omit<Card, 'id' | 'nodeId'>} card The card data to add.
 * @returns {Promise<Card>} A promise that resolves to the newly created card.
 */
export async function addCard(nodeId: string, card: Omit<Card, 'id' | 'nodeId'>): Promise<Card> {
	const newCard: Card = {
		...card,
		id: uuidv4(),
		nodeId: nodeId
	};
	await db.cards.add(newCard);
	return newCard;
}

/**
 * Adds multiple cards for a specific node in a single transaction.
 * @param {string} nodeId The ID of the node to associate the cards with.
 * @param {Omit<Card, 'id' | 'nodeId'>[]} cards An array of card data to add.
 * @returns {Promise<void>} A promise that resolves when the bulk operation is complete.
 */
export async function addCards(nodeId: string, cards: Omit<Card, 'id' | 'nodeId'>[]): Promise<void> {
	const newCards: Card[] = cards.map((card) => ({
		...card,
		id: uuidv4(),
		nodeId: nodeId
	}));
	await db.cards.bulkAdd(newCards);
}

/**
 * Updates an existing card or creates it if it doesn't exist (upsert).
 * @param {Card} card The card object to update or create. It must have a valid `id`.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function updateCard(card: Card): Promise<void> {
	await db.cards.put(card);
}

/**
 * Deletes a card from the database by its unique identifier.
 * @param {string} cardId The ID of the card to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 */
export async function deleteCard(cardId: string): Promise<void> {
	await db.cards.delete(cardId);
}
