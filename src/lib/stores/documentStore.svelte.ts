/**
 * @file Manages the lifecycle, state, and persistence of the active schema document using Svelte 5 Runes.
 * @module documentStore
 */
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import { fileSystemStore } from '@modules/file-system';
import { getDocumentProvider } from '$lib/core/services/persistenceService';
import * as errorService from '$lib/core/services/errorService';
import { i18n } from '$lib/utils/i18n.svelte';

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
      console.log(`[documentStore] Loading metadata for docId: ${docId}`);
      const metadata = fileSystemStore.getItem(docId);
      if (!metadata || metadata.type !== 'schema') {
        throw new Error(
          i18n.t('document.invalid_document_error', { docId })
        );
      }
      console.log(`[documentStore] Metadata loaded. Getting provider...`);
      const { ydoc, provider } = getDocumentProvider(docId);
      
      // Add a timeout for the sync process
      const SYNC_TIMEOUT = 5000; // 5 seconds
      const syncPromise = provider.whenSynced;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Document sync timed out')), SYNC_TIMEOUT)
      );

      await Promise.race([syncPromise, timeoutPromise]);
      console.log(`[documentStore] Provider synced.`);
      return { metadata, ydoc, provider };
    };
    const [loadedData] = await Promise.all([loadData(), minDelay]);
    documentState.metadata = loadedData.metadata;
    documentState.ydoc = loadedData.ydoc;
    documentState.provider = loadedData.provider;
    documentState.status = 'ready';
    console.log(`[documentStore] Document loaded. Status set to 'ready'.`);
    await fileSystemStore.setLastActiveDocId(docId);
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
    const newMetadata = await fileSystemStore.createSchema(title, parentId);
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
          content: [{ type: 'text', text: newMetadata.title }],
        },
        { type: 'paragraph' },
      ],
    };
    documentState.focusedNodeId = null;
    await fileSystemStore.setLastActiveDocId(newMetadata.id);
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
    await fileSystemStore.updateItem(docId, { title: trimmedTitle });
  } catch (error) {
    errorService.reportError(error, {
      operation: 'documentStore.updateTitle',
    });
    documentState.metadata = oldMetadata;
  }
}

export function initializeDocumentStoreListeners(): void {
  $effect(() => {
    const unsubscribe = fileSystemStore.subscribe((event) => {
      if (!event || !documentState.docId) return;

      if (event.type === 'reloaded') {
        const updatedMetadata = event.items.find(
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

      const item = event.item;
      // Handle "deleted all" or specific delete
      if (event.type === 'deleted') {
           if (item.id === 'all' || (documentState.docId && !fileSystemStore.getItem(documentState.docId))) {
               cleanup();
           }
           return;
      }

      if (event.type === 'updated' && item.id === documentState.docId) {
        // Sync H1 title if metadata title changed
        if (documentState.metadata && documentState.metadata.title !== item.title) {
          const ydoc = documentState.ydoc;
          if (ydoc) {
            const fragment = ydoc.getXmlFragment('prosemirror');
            const firstNode = fragment.get(0);
            
            // Check if the first node is an H1 heading
            if (
              firstNode instanceof Y.XmlElement && 
              firstNode.nodeName === 'heading' && 
              Number(firstNode.getAttribute('level')) === 1
            ) {
              // Update the text content of the H1
              if (firstNode.length > 0) {
                firstNode.delete(0, firstNode.length);
              }
              const newText = new Y.XmlText(item.title);
              firstNode.insert(0, [newText]);
            }
          }
        }

        if (JSON.stringify(documentState.metadata) !== JSON.stringify(item)) {
          documentState.metadata = item;
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
