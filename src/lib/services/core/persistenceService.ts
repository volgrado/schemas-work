/**
 * @file Abstracts the persistence layer for document content using Y.js and IndexedDB.
 * @module persistenceService
 *
 * @remarks
 * This service is the crucial link between the in-memory representation of a document and its
 * long-term storage. It leverages the `y-indexeddb` provider to create a robust, offline-first
 * persistence layer for Y.js documents.
 *
 * Key Architectural Principles:
 * - **Decoupling**: This service completely decouples the application's components and stores from the
 *   specifics of data storage. Components can interact with a `Y.Doc` without needing to know
 *   or care that it is being saved to IndexedDB. This makes the architecture more modular
 *   and allows for future changes to the persistence layer (e.g., adding a real-time backend)
 *   with minimal impact on the rest of the codebase.
 *
 * - **Isolation**: Each document is stored in its own separate IndexedDB database, identified by
 *   the `docId`. This is a critical design choice that ensures data integrity and prevents
 *   one document's data from interfering with another's. It also simplifies the process
 *   of deleting a document, as we can simply delete the entire database.
 *
 * - **Efficiency**: The `y-indexeddb` provider is highly efficient. It listens for changes to the
 *   `Y.Doc` and only writes the incremental updates (the "diffs") to IndexedDB, rather than
 *   saving the entire document on every change. This is a significant performance advantage,
 *   especially for large documents.
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
    provider,
  };
}
