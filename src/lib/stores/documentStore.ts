/**
 * @file Manages the lifecycle, state, and persistence of the currently active schema document.
 *
 * @remarks
 * This Svelte store is the primary orchestrator for handling the active document.
 * It serves as a high-level coordinator, bringing together several services to manage
 * the entire document lifecycle. Its key responsibilities include:
 *
 * - **Loading & Creation**: It fetches document metadata using the `directoryService` and
 *   initializes the Y.js collaborative document along with its persistence provider
 *   (`persistenceService`). This sets up the real-time and storage layers.
 *
 * - **State Management**: It meticulously tracks the document's status (`loading`, `ready`, `error`)
 *   to provide clear, unambiguous feedback to the UI, ensuring a smooth user experience.
 *
 * - **Resource Cleanup**: It guarantees that resources, particularly the Y.js provider
 *   connection to IndexedDB, are properly destroyed when a document is unloaded. This
 *   prevents memory leaks and database connection issues.
 *
 * - **Real-time Synchronization**: It subscribes to `directoryEvents` to react instantly
 *   to external changes, such as a file being renamed or deleted in another browser tab.
 *   This ensures the application state remains consistent across multiple windows or tabs.
 */

import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import { editorStore } from '$lib/stores/editorStore';
import * as directoryService from '$lib/services/core/directoryService';
import { directoryEvents } from '$lib/services/core/directoryService';
import { getDocumentProvider } from '$lib/services/core/persistenceService';
import * as errorService from '$lib/services/core/errorService';

/**
 * Represents the complete, detailed state of the active document within the application.
 */
export interface DocumentStoreState {
  /** The unique identifier (UUID) of the currently loaded document. */
  docId: string | null;
  /** The metadata associated with the document (e.g., title, parent folder ID). */
  metadata: SchemaMetadata | null;
  /** The Y.js document instance, which holds the collaborative data structure (CRDT). */
  ydoc: Y.Doc | null;
  /** The persistence provider that syncs the `ydoc` to a permanent store (IndexedDB). */
  provider: IndexeddbPersistence | null;
  /** The current loading status of the document, used to drive UI feedback. */
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Optional initial content (as a ProseMirror JSON object) used to populate a newly created document. */
  initialContent?: object;
}

/**
 * The initial, empty state of the document store before any document is loaded.
 * @internal
 */
const initialState: DocumentStoreState = {
  docId: null,
  metadata: null,
  ydoc: null,
  provider: null,
  status: 'idle',
  initialContent: undefined,
};

const _documentStore: Writable<DocumentStoreState> = writable(initialState);
const { subscribe, update, set } = _documentStore;

/**
 * Cleans up the resources for the currently active document. Its primary role is to
 * destroy the persistence provider, which safely closes the IndexedDB connection.
 * @internal
 */
function cleanup() {
  const currentState = get(_documentStore);
  if (currentState.provider) {
    currentState.provider.destroy();
  }
  set(initialState);
}

/**
 * Loads a document by its unique identifier.
 *
 * @remarks
 * This function orchestrates the entire asynchronous loading process:
 * 1. Cleans up any resources from a previously opened document.
 * 2. Fetches the document's metadata from the directory service.
 * 3. Initializes the Y.js document and its IndexedDB persistence provider.
 * 4. Waits for the provider to finish its initial sync with the database.
 * 5. Updates the store with the newly loaded document's complete state.
 * It also enforces a minimum loading time to prevent distracting UI flickering on fast loads.
 *
 * @param docId The unique identifier of the document to be loaded.
 */
async function loadDocument(docId: string) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    // Enforce a minimum loading time to prevent jarring UI flashes on cached loads.
    const MIN_LOADING_TIME = 300; // in milliseconds
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME));

    const loadData = async () => {
      const metadata = await directoryService.getItemById(docId);
      if (!metadata || metadata.type !== 'schema') {
        throw new Error(`Item is not a valid document: ${docId}`);
      }
      const { ydoc, provider } = getDocumentProvider(docId);
      await provider.whenSynced; // Ensure data is fully loaded from IndexedDB
      return { metadata, ydoc, provider };
    };

    const [loadedData] = await Promise.all([loadData(), minDelay]);

    set({
      docId,
      metadata: loadedData.metadata,
      ydoc: loadedData.ydoc,
      provider: loadedData.provider,
      status: 'ready',
      initialContent: undefined,
    });

    await directoryService.setLastActiveDocId(docId);
  } catch (error) {
    errorService.reportError(error, { operation: 'loadDocument', docId });
    set({ ...initialState, status: 'error' });
  }
}

/**
 * Creates a new document with a given title and optional initial content.
 *
 * @param title The title for the new document.
 * @param content Optional ProseMirror JSON object to populate the document with.
 * @param parentId Optional ID of the parent folder where the document should be created.
 * @returns The metadata of the newly created document.
 */
async function createNewDocument(
  title: string = 'New Schema',
  content?: object,
  parentId: string | null = null
) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    const newMetadata = await directoryService.createSchema(title, parentId);
    const { ydoc, provider } = getDocumentProvider(newMetadata.id);
    await provider.whenSynced;

    // If no specific content is provided, create a default structure with an H1 title.
    const finalInitialContent = content || {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: title }],
        },
      ],
    };

    set({
      docId: newMetadata.id,
      metadata: newMetadata,
      ydoc,
      provider,
      status: 'ready',
      initialContent: finalInitialContent, // Pass the initial content to the editor
    });

    await directoryService.setLastActiveDocId(newMetadata.id);
    return newMetadata;
  } catch (error) {
    errorService.reportError(error, { operation: 'createNewDocument', title, parentId });
    set({ ...initialState, status: 'error' });
    throw error; // Re-throw to allow the calling UI component to handle it
  }
}

/**
 * Clears the `initialContent` from the state. This is called by the editor once
 * it has consumed the initial content, preventing it from being re-applied on subsequent re-renders.
 */
function clearInitialContent() {
  update((state) => {
    if (state.initialContent) {
      return { ...state, initialContent: undefined };
    }
    return state;
  });
}

/**
 * Updates the title of the current document, both in the store and in the persistence layer.
 *
 * @remarks
 * This function performs an optimistic UI update on the store's metadata for responsiveness,
 * and then calls the `directoryService` to persist the change. If the persistence operation fails,
 * the metadata is reverted to its original state to maintain consistency.
 *
 * @param newTitle The new title for the document.
 */
async function updateTitle(newTitle: string) {
  const currentState = get(_documentStore);
  const { docId, metadata: currentMetadata } = currentState;
  if (!docId || !currentMetadata) return;

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || trimmedTitle === currentMetadata.title) return;

  const oldMetadata = { ...currentMetadata };
  const optimisticMetadata = { ...currentMetadata, title: trimmedTitle };

  // Optimistic UI update for a snappy user experience
  update((state) => ({ ...state, metadata: optimisticMetadata }));

  try {
    await directoryService.updateItemMetadata(docId, { title: trimmedTitle });
  } catch (error) {
    errorService.reportError(error, { operation: 'documentStore.updateTitle' });
    // Rollback on failure to keep the UI in sync with the backend state.
    update((state) => ({ ...state, metadata: oldMetadata }));
  }
}

// Subscribe to external directory changes to keep the active document store in sync.
directoryEvents.subscribe((event) => {
  if (!event) return;

  const currentState = get(_documentStore);
  if (!currentState.docId) return;

  // Handle the case where the currently open document is updated (e.g., renamed) in another tab.
  if (event.type === 'updated' && event.item.id === currentState.docId) {
    const newMetadata = event.item as SchemaMetadata;
    update((state) => ({ ...state, metadata: newMetadata }));

    // Also, intelligently update the H1 in the editor to reflect the new title.
    const editor = get(editorStore).instance;
    if (editor && newMetadata.title !== currentState.metadata?.title) {
      const { doc } = editor.state;
      const firstNode = doc.firstChild;

      if (firstNode && firstNode.type.name === 'heading' && firstNode.attrs.level === 1) {
        // If an H1 already exists, replace its content.
        if (firstNode.textContent !== newMetadata.title) {
          const from = 1;
          const to = from + firstNode.content.size;
          editor.chain().setTextSelection({ from, to }).insertContent(newMetadata.title).run();
        }
      } else {
        // If no H1 exists, insert one at the top of the document.
        editor.chain().focus().insertContentAt(0, {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: newMetadata.title }],
        }).run();
      }
    }
  }

  // Handle the case where the currently open document is deleted in another tab.
  if (event.type === 'deleted' && event.item.id === currentState.docId) {
    const findAndLoadReplacementDoc = async () => {
      const allSchemas = (await directoryService.getAllItems()).filter((i) => i.type === 'schema');
      if (allSchemas.length > 0) {
        // Gracefully load another available schema.
        await loadDocument(allSchemas[0].id);
      } else {
        // If no other schemas exist, create a new one to prevent an empty state.
        await createNewDocument('My First Schema');
      }
    };
    findAndLoadReplacementDoc();
  }
});

/**
 * The singleton instance of the document store, providing a centralized and consistent interface
 * for managing the active document throughout the application.
 */
export const documentStore = {
  /** Subscribes to changes in the document store's state. */
  subscribe,
  /** Loads a document by its unique ID. */
  loadDocument,
  /** Creates a new, empty document and loads it. */
  createNewDocument,
  /** Clears the initial content flag after it has been consumed by the editor, preventing re-application. */
  clearInitialContent,
  /** Updates the title of the currently active document. */
  updateTitle,
};
