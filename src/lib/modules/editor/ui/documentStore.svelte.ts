/**
 * @file Manages the lifecycle, state, and persistence of the active schema document using Svelte 5 Runes.
 * @module documentStore
 */
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import { fileSystemStore } from '@modules/file-system';
import * as errorService from '$lib/core/services/errorService';
import { DocumentService } from '$lib/modules/editor/domain/documentService';

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
export const documentState = $state<DocumentState>({ ...initialState });

// --- Private Helper Functions ---
function cleanup(): void {
  if (documentState.provider) {
    documentState.provider.destroy();
  }
  Object.assign(documentState, initialState);
}

// --- Public Action Functions ---

export async function load(
  docId: string,
  nodeIdToFocus: string | null = null
): Promise<void> {
  cleanup(); // Ensure clean state before loading
  documentState.status = 'loading';
  documentState.focusedNodeId = nodeIdToFocus;
  documentState.docId = docId;

  try {
    const { metadata, ydoc, provider } =
      await DocumentService.loadDocument(docId);

    documentState.metadata = metadata;
    documentState.ydoc = ydoc;
    documentState.provider = provider;
    documentState.status = 'ready';
  } catch (error) {
    errorService.reportError(error, { operation: 'loadDocument', docId });
    cleanup();
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
    const { metadata, ydoc, provider } = await DocumentService.createDocument(
      title,
      parentId
    );

    documentState.docId = metadata.id;
    documentState.metadata = metadata;
    documentState.ydoc = ydoc;
    documentState.provider = provider;
    documentState.status = 'ready';

    documentState.initialContent = content ? $state.snapshot(content) : {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: metadata.title }],
        },
        { type: 'paragraph' },
      ],
    };

    return metadata;
  } catch (error) {
    errorService.reportError(error, {
      operation: 'createNewDocument',
      title,
      parentId,
    });
    cleanup();
    documentState.status = 'error';
    throw error;
  }
}

export async function updateTitle(newTitle: string): Promise<void> {
  const { docId, metadata: currentMetadata } = documentState;
  if (!docId || !currentMetadata) return;

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || trimmedTitle === currentMetadata.title) return;

  const oldMetadata = { ...currentMetadata };
  documentState.metadata = { ...currentMetadata, title: trimmedTitle };

  try {
    await DocumentService.updateDocumentTitle(docId, trimmedTitle);
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
        if (
          item.id === 'all' ||
          (documentState.docId && !fileSystemStore.getItem(documentState.docId))
        ) {
          cleanup();
        }
        return;
      }

      if (event.type === 'updated' && item.id === documentState.docId) {
        // Sync H1 title if metadata title changed
        if (
          documentState.metadata &&
          documentState.metadata.title !== item.title
        ) {
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
