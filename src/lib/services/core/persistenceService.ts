/**
 * @file Abstracts the persistence layer for document content using Y.js and IndexedDB.
 * @module persistenceService
 *
 * @remarks
 * This service acts as the bridge between the in-memory, collaborative representation
 * of a document (a `Y.Doc`) and its physical storage in the browser (IndexedDB).
 * By centralizing this logic, the rest of the application can operate on Y.js data
 * structures without being aware of the specific persistence mechanism.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

/**
 * A container that bundles a Y.js document instance with its persistence provider.
 */
export interface DocumentProvider {
	/** The Y.js document instance. */
	ydoc: Y.Doc;
	/** The persistence provider that syncs the `ydoc` with IndexedDB. */
	provider: IndexeddbPersistence;
}

/**
 * Creates and returns a fully initialized persistence provider for a specific document.
 *
 * @param {string} docId The unique identifier for the document. This is used as the
 *   name of the IndexedDB database, ensuring each document's data is isolated.
 * @returns {DocumentProvider} An object containing the initialized `Y.Doc` and its
 *   connected `IndexeddbPersistence` provider.
 */
export function getDocumentProvider(docId: string): DocumentProvider {
	const ydoc = new Y.Doc();
	const provider = new IndexeddbPersistence(docId, ydoc);

	return {
		ydoc,
		provider
	};
}
