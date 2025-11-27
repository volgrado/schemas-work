/**
 * @file Abstracts the persistence layer for document content using Y.js and IndexedDB.
 * @module persistenceService
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import Dexie, { type Table } from 'dexie';

// --- Caching for active providers to prevent deadlocks ---
const providers = new Map<string, IndexeddbPersistence>();

// --- Dexie setup for read-only access ---
// A Dexie class to connect to a specific document's database by name.
class DocDatabase extends Dexie {
  // THE FIX: The table stores raw Uint8Array data directly.
  // The key is a number, the value is a Uint8Array.
  updates!: Table<Uint8Array, number>;

  constructor(dbName: string) {
    super(dbName);

    // The y-indexeddb library creates an object store (named 'updates' by default)
    // with an out-of-line, auto-incrementing primary key.
    // The Dexie syntax for this is simply '++'.
    this.version(1).stores({
      updates: '++',
    });
  }
}

/**
 * A container that bundles a Y.js document instance with its persistence provider.
 */
export interface DocumentProvider {
  ydoc: Y.Doc;
  provider: IndexeddbPersistence;
}

/**
 * Creates and returns a fully initialized persistence provider for a specific document.
 * Caches providers to ensure only one active connection per document exists.
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
 * (REWRITTEN) Creates a read-only, in-memory snapshot of a Y.Doc from its IndexedDB.
 */
export async function getReadOnlyYDoc(docId: string): Promise<Y.Doc> {
  const db = new DocDatabase(docId);
  const ydoc = new Y.Doc();
  try {
    // THE FIX: .toArray() now correctly returns a Uint8Array[].
    const allUpdates = await db.updates.toArray();

    // Add a safety filter just in case, though it should not be necessary now.
    const validUpdates = allUpdates.filter(
      (update) => update instanceof Uint8Array
    );

    if (validUpdates.length > 0) {
      // THE FIX: We no longer need .map(), as allUpdates is already the array we need.
      const mergedUpdates = Y.mergeUpdates(validUpdates);
      Y.applyUpdate(ydoc, mergedUpdates);
    }
  } catch (error) {
    console.error(
      `[persistenceService] Failed to get read-only doc for ${docId}`,
      error
    );
  } finally {
    db.close();
  }
  return ydoc;
}

/**
 * Deletes the persistence provider and the underlying IndexedDB database for a document.
 */
export async function deleteDocument(docId: string): Promise<void> {
  // 1. Destroy active provider if it exists
  if (providers.has(docId)) {
    const provider = providers.get(docId)!;
    provider.destroy();
    providers.delete(docId);
  }

  // 2. Delete the Dexie database
  try {
    await Dexie.delete(docId);
  } catch (error) {
    console.error(`[persistenceService] Failed to delete database for ${docId}`, error);
    throw error;
  }
}
