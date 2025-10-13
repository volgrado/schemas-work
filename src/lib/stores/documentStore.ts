import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { Editor } from '@tiptap/core';

// Usamos la API de servicios refactorizada
import * as directoryService from '$lib/services/core/directoryService';
import { directoryEvents } from '$lib/services/core/directoryService';

import { getDocumentProvider } from '$lib/services/core/persistenceService';
import * as errorService from '$lib/services/core/errorService';
// ✅ NUEVO: Importamos el servicio centralizado que contiene la lógica de negocio
import * as schemaService from '$lib/services/features/schemaService';

import type { TreeNodeData } from '$lib/types/tree';

/**
 * Represents the state of the currently active document.
 */
export interface DocumentStoreState {
  /** The unique identifier of the document. */
  docId: string | null;
  /** The metadata associated with the document. */
  metadata: SchemaMetadata | null;
  /** The Yjs document instance. */
  ydoc: Y.Doc | null;
  /** The persistence provider for the Yjs document. */
  provider: IndexeddbPersistence | null;
  /** The current status of the document store. */
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** The initial content to populate a new document with. */
  initialContent?: object;
}

/**
 * The initial state of the document store.
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
 * Cleans up the current document state, destroying the provider and resetting the store.
 */
function cleanup() {
  const currentState = get(_documentStore);
  if (currentState.provider) {
    currentState.provider.destroy();
  }
  schemaTreeData.set(null); // Clear the tree when changing documents
  set(initialState);
}

/**
 * Loads a document by its ID, setting up the Yjs document and persistence.
 * @param {string} docId - The ID of the document to load.
 */
async function loadDocument(docId: string) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    const metadata = await directoryService.getItemById(docId);
    if (!metadata || metadata.type !== 'schema') {
      throw new Error(`Item is not a valid document: ${docId}`);
    }

    const { ydoc, provider } = getDocumentProvider(docId);
    await provider.whenSynced;

    set({
      docId,
      metadata,
      ydoc,
      provider,
      status: 'ready',
      initialContent: undefined,
    });

    await directoryService.setLastActiveDocId(docId);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'loadDocument',
      docId: docId,
    });
    set({ ...initialState, status: 'error' });
  }
}

/**
 * Creates a new document with a given title and optional content.
 * @param {string} [title='New Schema'] - The title for the new document.
 * @param {object} [content] - Optional initial content for the document.
 * @param {string | null} [parentId=null] - The ID of the parent folder.
 */
async function createNewDocument(
  title: string = 'New Schema',
  content?: object,
  parentId: string | null = null,
) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    const newMetadata = await directoryService.createSchema(title, parentId);
    const { ydoc, provider } = getDocumentProvider(newMetadata.id);
    await provider.whenSynced;

    set({
      docId: newMetadata.id,
      metadata: newMetadata,
      ydoc,
      provider,
      status: 'ready',
      initialContent: content,
    });

    await directoryService.setLastActiveDocId(newMetadata.id);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'createNewDocument',
      title: title,
      parentId: parentId,
    });
    set({ ...initialState, status: 'error' });
  }
}

/**
 * Clears the initial content from the store state.
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
 * Updates the title of the active document, persisting the change
 * through the directoryService and updating the local store state.
 * Uses an optimistic approach for a smooth user experience.
 *
 * @param {string} newTitle - The new title for the document.
 */
async function updateTitle(newTitle: string) {
  const currentState = get(_documentStore);
  const { docId, metadata: currentMetadata } = currentState;

  if (!docId || !currentMetadata) {
    errorService.reportError(
      new Error('Attempt to update title without a loaded document.'),
      {
        operation: 'documentStore.updateTitle',
        description: 'Pre-condition failed: docId or metadata is null.',
      },
    );
    return;
  }

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || trimmedTitle === currentMetadata.title) {
    return; // Do nothing if the title is empty or hasn't changed
  }

  const oldMetadata = { ...currentMetadata };
  const optimisticMetadata = { ...currentMetadata, title: trimmedTitle };

  // 1. Optimistic Update: The UI updates immediately.
  update((state) => ({ ...state, metadata: optimisticMetadata }));

  try {
    // 2. Persistence: Calls the existing function in your directoryService.
    await directoryService.updateItemMetadata(docId, { title: trimmedTitle });
  } catch (error) {
    // 3. Rollback: If saving fails, revert the change in the UI.
    errorService.reportError(error, {
      operation: 'documentStore.updateTitle.persistence',
      description: 'Failed to persist title update. Rolling back UI.',
      docId: docId,
    });
    update((state) => ({ ...state, metadata: oldMetadata }));
  }
}

// --- REFACTORED TREE SYNCHRONIZATION LOGIC ---

/**
 * The reactive store that will hold the data for the SchemaTree component.
 */
export const schemaTreeData = writable<TreeNodeData | null>(null);

/**
 * REFACTORED: This function now delegates the conversion logic to `schemaService`.
 * Its sole responsibility is to act as a "bridge" between the editor and the tree store.
 * @param {Editor} editor - The Tiptap editor instance.
 */
export function syncTreeWithDocument(editor: Editor) {
  if (!editor || editor.isDestroyed) {
    schemaTreeData.set(null); // Reset the tree if there is no editor
    return;
  }

  // 1. Get the document node from the editor
  const docNode = editor.state.doc;
  // 2. Call the centralized service to do the conversion
  const newTreeData = schemaService.documentToTreeData(docNode);
  // 3. Update the store with the result
  schemaTreeData.set(newTreeData);
}

/**
 * NEW: Reactive subscription to directory events.
 * This keeps the state of the active document synchronized with changes
 * that occur in other parts of the application (like the FileExplorer).
 */
directoryEvents.subscribe((event) => {
  if (!event) return;

  const currentState = get(_documentStore);

  // If there is no loaded document, there is nothing to do.
  if (!currentState.docId) return;

  // --- EVENT REACTION ---

  // Case 1: The active document WAS UPDATED (e.g., renamed in the explorer)
  if (event.type === 'updated' && event.item.id === currentState.docId) {
    console.log(
      '[documentStore] The active document was updated externally. Synchronizing metadata.',
    );
    update((state) => ({
      ...state,
      metadata: event.item, // We use the data from the event, which is the new source of truth
    }));
  }

  // Case 2: The active document WAS DELETED
  if (event.type === 'deleted' && event.item.id === currentState.docId) {
    console.warn(
      '[documentStore] The active document was deleted! Searching for a replacement document.',
    );

    // Logic to load another document or create a new one
    const findAndLoadReplacementDoc = async () => {
      const allSchemas = (await directoryService.getAllItems()).filter(
        (i) => i.type === 'schema',
      );
      if (allSchemas.length > 0) {
        // Load the first available schema
        await loadDocument(allSchemas[0].id);
      } else {
        // If none are left, create a new one
        await createNewDocument('My First Schema');
      }
    };

    findAndLoadReplacementDoc();
  }
});

/**
 * The main export of the document store.
 */
export const documentStore = {
  subscribe,
  loadDocument,
  createNewDocument,
  clearInitialContent,
  updateTitle,
};
