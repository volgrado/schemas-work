/**
 * @file persistenceService.ts
 * @module core/services
 * @description
 * A robust abstraction layer for managing document persistence using Y.js and IndexedDB.
 *
 * This service handles:
 * - Creating and caching active Y.js document instances (singletons per document ID).
 * - managing the lifecycle of `IndexeddbPersistence` providers.
 * - Creating read-only snapshots of documents without activating a full synchronization provider.
 * - Deleting document databases cleanly.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import Dexie, { type Table } from 'dexie';

// --- State ---
/**
 * Cache of active persistence providers.
 * Ensures that only one provider exists per document ID to prevent locking issues.
 */
const providers = new Map<string, IndexeddbPersistence>();

// --- Internal Dexie Setup ---
/**
 * A minimal Dexie wrapper to access the raw binary data stored by y-indexeddb.
 * This allows us to perform read-only operations without initializing a full Yjs provider.
 */
class DocDatabase extends Dexie {
  /** The table storing Y.js updates as binary blobs. */
  updates!: Table<Uint8Array, number>;

  constructor(dbName: string) {
    super(dbName);
    // y-indexeddb uses a store named 'updates' with an auto-incrementing primary key.
    this.version(1).stores({
      updates: '++',
    });
  }
}

/**
 * Encapsulates a Y.js document and its persistence provider.
 */
export interface DocumentProvider {
  /** The Y.js document instance. */
  ydoc: Y.Doc;
  /** The provider synchronizing the document with IndexedDB. */
  provider: IndexeddbPersistence;
}

// --- Public API ---

/**
 * Retrieves or creates a persistence provider for a given document.
 * Implements the Singleton pattern per document ID.
 *
 * @param docId - The unique identifier of the document.
 * @returns {DocumentProvider} The document and its provider.
 */
export function getDocumentProvider(docId: string): DocumentProvider {
  if (providers.has(docId)) {
    const provider = providers.get(docId)!;
    return { ydoc: provider.doc, provider };
  }
  const ydoc = new Y.Doc();
  const provider = new IndexeddbPersistence(docId, ydoc);
  providers.set(docId, provider);
  return { ydoc, provider };
}

/**
 * Creates a temporary, read-only in-memory snapshot of a document.
 * This is useful for operations like search indexing or exporting where
 * we don't want to trigger a full sync or modify the database.
 *
 * @param docId - The ID of the document to load.
 * @returns {Promise<Y.Doc>} A promise resolving to the rehydrated Y.js document.
 */
export async function getReadOnlyYDoc(docId: string): Promise<Y.Doc> {
  const db = new DocDatabase(docId);
  const ydoc = new Y.Doc();
  try {
    // Fetch all binary updates from IndexedDB
    const allUpdates = await db.updates.toArray();

    // Ensure we only process valid binary data
    const validUpdates = allUpdates.filter(
      (update) => update instanceof Uint8Array
    );

    if (validUpdates.length > 0) {
      // Merge all updates into a single update and apply it to the doc
      const mergedUpdates = Y.mergeUpdates(validUpdates);
      Y.applyUpdate(ydoc, mergedUpdates);
    }
  } catch (error) {
    console.error(
      `[persistenceService] Failed to get read-only doc for ${docId}`,
      error
    );
  } finally {
    db.close(); // Always close the connection
  }
  return ydoc;
}

/**
 * Permanently deletes a document's data from storage.
 * Handles cleanup of both the active provider (if any) and the IndexedDB database.
 *
 * @param docId - The ID of the document to delete.
 * @returns {Promise<void>}
 */
export async function deleteDocument(docId: string): Promise<void> {
  // 1. Destroy and remove the active provider from the cache
  if (providers.has(docId)) {
    const provider = providers.get(docId)!;
    provider.destroy();
    providers.delete(docId);
  }

  // 2. Delete the underlying IndexedDB database
  try {
    await Dexie.delete(docId);
  } catch (error) {
    console.error(`[persistenceService] Failed to delete database for ${docId}`, error);
    throw error;
  }
}
