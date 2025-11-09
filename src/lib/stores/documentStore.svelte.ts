/**
 * @file Manages the lifecycle, state, and persistence of the active schema document using Svelte 5 Runes.
 * @module documentStore
 */
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import { get as getStoreValue } from 'svelte/store';
import {
  directoryEvent,
  getItemById,
  setLastActiveDocId,
  createSchema,
  updateItemMetadata,
} from '$lib/services/core/directoryService';
import { getDocumentProvider } from '$lib/services/core/persistenceService';
import * as errorService from '$lib/services/core/errorService';
import { t } from '$lib/utils/i18n';

// --- Type and State Definitions ---
export interface DocumentState {
  docId: string | null;
  metadata: SchemaMetadata | null;
  ydoc: Y.Doc | null;
  provider: IndexeddbPersistence | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  initialContent?: object;
  focusedNodeId: string | null;
}

const initialState: DocumentState = {
  docId: null,
  metadata: null,
  ydoc: null,
  provider: null,
  status: 'idle',
  initialContent: undefined,
  focusedNodeId: null,
};

// The reactive state is now exported directly.
export let documentState = $state<DocumentState>({ ...initialState });

// --- Private Helper Functions ---
function cleanup(): void {
  if (documentState.provider) {
    documentState.provider.destroy();
  }
  Object.assign(documentState, initialState);
}

// --- Public Action Functions (now exported directly) ---
export async function load(
  docId: string,
  nodeIdToFocus: string | null = null
): Promise<void> {
  if (documentState.provider) {
    documentState.provider.destroy();
  }
  documentState.status = 'loading';
  documentState.focusedNodeId = nodeIdToFocus;
  documentState.docId = docId;
  documentState.ydoc = null;
  documentState.metadata = null;
  try {
    const MIN_LOADING_TIME = 300;
    const minDelay = new Promise((resolve) =>
      setTimeout(resolve, MIN_LOADING_TIME)
    );
    const loadData = async () => {
      const metadata = await getItemById(docId);
      if (!metadata || metadata.type !== 'schema') {
        throw new Error(
          getStoreValue(t)('document.invalid_document_error', { docId })
        );
      }
      const { ydoc, provider } = getDocumentProvider(docId);
      await provider.whenSynced;
      return { metadata, ydoc, provider };
    };
    const [loadedData] = await Promise.all([loadData(), minDelay]);
    documentState.metadata = loadedData.metadata;
    documentState.ydoc = loadedData.ydoc;
    documentState.provider = loadedData.provider;
    documentState.status = 'ready';
    console.log(`[documentStore] Document loaded. Status set to 'ready'.`); // Added this log for confirmation
    await setLastActiveDocId(docId);
  } catch (error) {
    errorService.reportError(error, { operation: 'loadDocument', docId });
    Object.assign(documentState, initialState);
    documentState.status = 'error';
  }
}

export async function create(
  title: string,
  content?: object,
  parentId: string | null = null
): Promise<SchemaMetadata | undefined> {
  cleanup();
  documentState.status = 'loading';
  try {
    const newMetadata = await createSchema(title, parentId);
    const { ydoc, provider } = getDocumentProvider(newMetadata.id);
    await provider.whenSynced;
    documentState.docId = newMetadata.id;
    documentState.metadata = newMetadata;
    documentState.ydoc = ydoc;
    documentState.provider = provider;
    documentState.status = 'ready';
    documentState.initialContent = content || {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: title }],
        },
        { type: 'paragraph' },
      ],
    };
    documentState.focusedNodeId = null;
    await setLastActiveDocId(newMetadata.id);
    return newMetadata;
  } catch (error) {
    errorService.reportError(error, {
      operation: 'createNewDocument',
      title,
      parentId,
    });
    Object.assign(documentState, initialState);
    documentState.status = 'error';
    throw error;
  }
}

export async function updateTitle(newTitle: string): Promise<void> {
  const { docId, metadata: currentMetadata } = documentState;
  if (!docId || !currentMetadata) return;
  const trimmedTitle = newTitle.trim().trim();
  if (!trimmedTitle || trimmedTitle === currentMetadata.title) return;
  const oldMetadata = { ...currentMetadata };
  documentState.metadata = { ...currentMetadata, title: trimmedTitle };
  try {
    await updateItemMetadata(docId, { title: trimmedTitle });
  } catch (error) {
    errorService.reportError(error, {
      operation: 'documentStore.updateTitle',
    });
    documentState.metadata = oldMetadata;
  }
}

export function initializeDocumentStoreListeners(): void {
  $effect(() => {
    const unsubscribe = directoryEvent.subscribe((event) => {
      if (!event || !documentState.docId) return;
      if (event.type === 'reloaded' && Array.isArray(event.item)) {
        const updatedMetadata = event.item.find(
          (doc: SchemaMetadata) => doc.id === documentState.docId
        );
        if (!updatedMetadata) {
          cleanup();
        } else if (
          JSON.stringify(documentState.metadata) !==
          JSON.stringify(updatedMetadata)
        ) {
          documentState.metadata = updatedMetadata;
        }
        return;
      }
      if (!Array.isArray(event.item)) {
        const item = event.item;
        if (event.type === 'deleted' && item.id === documentState.docId) {
          cleanup();
        }
        if (event.type === 'updated' && item.id === documentState.docId) {
          if (JSON.stringify(documentState.metadata) !== JSON.stringify(item)) {
            documentState.metadata = item;
          }
        }
      }
    });
    return () => {
      unsubscribe();
    };
  });
}

export const close = cleanup;

export function setFocusCommand(nodeId: string) {
  documentState.focusedNodeId = nodeId;
}

export function clearFocusCommand() {
  if (documentState.focusedNodeId) {
    documentState.focusedNodeId = null;
  }
}
export function clearInitialContent() {
  if (documentState.initialContent) {
    documentState.initialContent = undefined;
  }
}
