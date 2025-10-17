/**
 * @file Abstracts the persistence layer for document content using Y.js and IndexedDB.
 *
 * @remarks
 * This service acts as the definitive bridge between the in-memory, collaborative
 * representation of a document (a `Y.Doc`) and its physical storage within the user's
 * browser (via IndexedDB). By centralizing and encapsulating this logic, the rest of
 * the application can operate on Y.js data structures without needing to be aware of
 * the specific persistence mechanism.
 *
 * This abstraction is critical for future flexibility. For example, if the application
 * were to add real-time, peer-to-peer collaboration, the `y-indexeddb` provider could
 * be swapped with or augmented by `y-webrtc`. This change could be made entirely
 * within this service, without requiring any significant refactoring of UI components
 * or application state management stores.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

/**
 * A container that bundles a Y.js document instance with its corresponding
 * persistence provider.
 */
export interface DocumentProvider {
  /** The Y.js document instance, which holds the shared, collaborative data structures. */
  ydoc: Y.Doc;
  /** The persistence provider responsible for syncing the `ydoc` with IndexedDB. */
  provider: IndexeddbPersistence;
}

/**
 * Creates and returns a fully initialized persistence provider for a specific Y.js document.
 *
 * @remarks
 * When this function is invoked for a given `docId`, it performs two key actions:
 * 1.  It initializes a new `Y.Doc`, which serves as the in-memory container for the
 *     document's content.
 * 2.  It immediately hooks this `Y.Doc` up to an `IndexeddbPersistence` provider. This
 *     provider automatically attempts to load any existing data from the IndexedDB
 *     database that matches the `docId`. From that moment on, it keeps the in-memory
 *     `ydoc` synchronized with the database, automatically and transparently saving
 *     any local or remote changes.
 *
 * @param docId - The unique identifier for the document. This ID is crucially used as the
 *                name of the IndexedDB database, ensuring that each document's data
 *                is stored in its own isolated database.
 * @returns An object containing both the initialized `Y.Doc` and its connected
 *          `IndexeddbPersistence` provider.
 *
 * @example
 * // Get a provider for a document with a specific ID.
 * const { ydoc, provider } = getDocumentProvider('my-unique-document-id');
 *
 * // The ydoc is now ready for use. Any changes made to it will be automatically persisted.
 * const ytext = ydoc.getText('content');
 * ytext.insert(0, 'This change is saved to IndexedDB automatically!');
 */
export function getDocumentProvider(docId: string): DocumentProvider {
  // A Y.Doc is the core CRDT data structure in Y.js for a collaborative document.
  const ydoc = new Y.Doc();

  // The IndexeddbPersistence provider connects the in-memory ydoc to a local IndexedDB
  // database. It immediately loads any data from the DB named `docId` into the ydoc.
  // All subsequent changes to the ydoc will be automatically saved to the database.
  const provider = new IndexeddbPersistence(docId, ydoc);

  return {
    ydoc,
    provider,
  };
}
