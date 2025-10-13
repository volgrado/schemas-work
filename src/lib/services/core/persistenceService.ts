// src/lib/services/core/persistenceService.ts

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

/**
 * This service abstracts the persistence layer for document content.
 * Its main responsibility is to configure and provide the "provider"
 * that connects a collaborative document (Y.Doc) with the browser's
 * local storage (IndexedDB).
 *
 * Encapsulating this logic here allows for changing the persistence backend
 * in the future (e.g., to y-webrtc or a central server) without altering
 * the application's stores or components.
 */

/**
 * Creates and returns a persistence provider for a specific Y.js document.
 *
 * @param {string} docId - The unique identifier of the document to be persisted.
 *        This `docId` will be used as the database name in IndexedDB,
 *        isolating the content of each document.
 * @returns {{ ydoc: Y.Doc; provider: IndexeddbPersistence }} An object containing the Y.js document (`Y.Doc`) and the
 *          persistence provider (`IndexeddbPersistence`).
 */
export function getDocumentProvider(docId: string): {
  ydoc: Y.Doc;
  provider: IndexeddbPersistence;
} {
  // 1. An empty instance of Y.Doc is created. This is the container
  //    for our collaborative document in memory.
  const ydoc = new Y.Doc();

  // 2. The persistence provider is instantiated. At the time of creation,
  //    `y-indexeddb` automatically attempts to load any existing data
  //    from the IndexedDB database with the name `docId` and synchronizes it
  //    with our `ydoc`.
  //
  //    From this moment on, any changes made to `ydoc` will be
  //    automatically saved to IndexedDB.
  const provider = new IndexeddbPersistence(docId, ydoc);

  return {
    ydoc,
    provider,
  };
}
