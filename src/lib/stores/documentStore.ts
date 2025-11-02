/**
 * @file Manages the lifecycle, state, and persistence of the active schema document.
 * @module documentStore
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
import { t } from '$lib/utils/i18n';
import * as migrationService from '$lib/services/core/migrationService';
import { prosemirrorJsonToYXmlFragment } from '$lib/utils/yjsUtils';

type TiptapJSONNode = { type: string; [key: string]: any };

export interface DocumentStoreState {
  docId: string | null;
  metadata: SchemaMetadata | null;
  ydoc: Y.Doc | null;
  provider: IndexeddbPersistence | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  initialContent?: object;
  focusedNodeId: string | null; // <-- ADDED: Holds the command to focus a specific node on load.
}

const initialState: DocumentStoreState = {
  docId: null,
  metadata: null,
  ydoc: null,
  provider: null,
  status: 'idle',
  initialContent: undefined,
  focusedNodeId: null, // <-- ADDED: Initialize the focus command as null.
};

const _documentStore: Writable<DocumentStoreState> = writable(initialState);
const { subscribe, update, set } = _documentStore;

function cleanup() {
  const currentState = get(_documentStore);
  if (currentState.provider) {
    currentState.provider.destroy();
  }
  set(initialState);
}

/**
 * @description (MODIFIED) Loads a document by its ID and optionally accepts a nodeId to focus.
 * @param docId The unique ID of the document to load.
 * @param nodeIdToFocus Optional ID of the node to focus after the document is ready.
 */
async function loadDocument(
  docId: string,
  nodeIdToFocus: string | null = null // <-- CHANGED: Added optional parameter
): Promise<void> {
  cleanup();
  // Set the focus command at the very beginning of the loading process.
  update((state) => ({
    ...state,
    status: 'loading',
    focusedNodeId: nodeIdToFocus, // <-- CHANGED: Set the focus command
  }));

  try {
    const MIN_LOADING_TIME = 300;
    const minDelay = new Promise((resolve) =>
      setTimeout(resolve, MIN_LOADING_TIME)
    );

    const loadData = async () => {
      const metadata = await directoryService.getItemById(docId);
      if (!metadata || metadata.type !== 'schema') {
        throw new Error(get(t)('document.invalid_document_error', { docId }));
      }
      const { ydoc, provider } = getDocumentProvider(docId);
      await provider.whenSynced;

      // --- MIGRATION TRIGGER (Unchanged) ---
      const prosemirrorFragment = ydoc.getXmlFragment('prosemirror');
      const contentJson = prosemirrorFragment.toJSON();
      if (
        Array.isArray(contentJson) &&
        contentJson.some((node: any) => node.type === 'bulletList')
      ) {
        console.log(
          `[Migration] Old list-based structure detected for docId: ${docId}. Starting migration.`
        );
        const oldDocJson = { type: 'doc' as const, content: contentJson };
        const newContentBody =
          migrationService.convertListToHeadings(oldDocJson);
        ydoc.transact(() => {
          prosemirrorFragment.delete(1, prosemirrorFragment.length - 1);
          const newYFragment = prosemirrorJsonToYXmlFragment(newContentBody);
          const childrenToInsert = newYFragment
            .toArray()
            .filter(
              (child): child is Y.XmlElement | Y.XmlText =>
                child instanceof Y.XmlElement || child instanceof Y.XmlText
            );
          prosemirrorFragment.insert(1, childrenToInsert);
        }, 'schema-migration');
        console.log('[Migration] Document migration successful.');
      }
      // --- END MIGRATION TRIGGER ---

      return { metadata, ydoc, provider };
    };

    const [loadedData] = await Promise.all([loadData(), minDelay]);

    update((state) => ({
      ...state,
      docId,
      metadata: loadedData.metadata,
      ydoc: loadedData.ydoc,
      provider: loadedData.provider,
      status: 'ready',
      // The focusedNodeId is already set from the initial update call
    }));

    await directoryService.setLastActiveDocId(docId);
  } catch (error) {
    errorService.reportError(error, { operation: 'loadDocument', docId });
    set({ ...initialState, status: 'error' });
  }
}

// --- ADDED: New function to clear the focus command after it's been handled ---
/**
 * Clears the `focusedNodeId` from the state once consumed by the editor.
 * This prevents the focus action from re-triggering on subsequent state updates.
 */
function clearFocusCommand(): void {
  update((state) => {
    if (state.focusedNodeId) {
      return { ...state, focusedNodeId: null };
    }
    return state;
  });
}

// All other functions (createNewDocument, clearInitialContent, updateTitle, and the directoryEvents subscription)
// remain unchanged.

// ... createNewDocument function ...
async function createNewDocument(
  title: string = get(t)('document.new_schema_title'),
  content?: object,
  parentId: string | null = null
): Promise<SchemaMetadata | undefined> {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));
  try {
    const newMetadata = await directoryService.createSchema(title, parentId);
    const { ydoc, provider } = getDocumentProvider(newMetadata.id);
    await provider.whenSynced;
    const finalInitialContent = content || {
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
    set({
      docId: newMetadata.id,
      metadata: newMetadata,
      ydoc,
      provider,
      status: 'ready',
      initialContent: finalInitialContent,
      focusedNodeId: null, // Ensure new docs don't have a focus command
    });
    await directoryService.setLastActiveDocId(newMetadata.id);
    return newMetadata;
  } catch (error) {
    errorService.reportError(error, {
      operation: 'createNewDocument',
      title,
      parentId,
    });
    set({ ...initialState, status: 'error' });
    throw error;
  }
}

// ... clearInitialContent function ...
function clearInitialContent(): void {
  update((state) => {
    if (state.initialContent) {
      return { ...state, initialContent: undefined };
    }
    return state;
  });
}

// ... updateTitle function ...
async function updateTitle(newTitle: string): Promise<void> {
  const currentState = get(_documentStore);
  const { docId, metadata: currentMetadata } = currentState;
  if (!docId || !currentMetadata) return;
  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || trimmedTitle === currentMetadata.title) return;
  const oldMetadata = { ...currentMetadata };
  const optimisticMetadata = { ...currentMetadata, title: trimmedTitle };
  update((state) => ({ ...state, metadata: optimisticMetadata }));
  try {
    await directoryService.updateItemMetadata(docId, { title: trimmedTitle });
  } catch (error) {
    errorService.reportError(error, { operation: 'documentStore.updateTitle' });
    update((state) => ({ ...state, metadata: oldMetadata }));
  }
}

// ... directoryEvents subscription ...
directoryEvents.subscribe((event) => {
  if (!event) return;
  const currentState = get(_documentStore);
  if (!currentState.docId) return;
  if (event.type === 'updated' && event.item.id === currentState.docId) {
    const newMetadata = event.item as SchemaMetadata;
    update((state) => ({ ...state, metadata: newMetadata }));
    const editor = get(editorStore).instance;
    if (!editor) return;
    if (editor.isFocused) return;
    if (newMetadata.title !== currentState.metadata?.title) {
      const { doc } = editor.state;
      const firstNode = doc.firstChild;
      if (
        firstNode &&
        firstNode.type.name === 'heading' &&
        firstNode.attrs.level === 1
      ) {
        if (firstNode.textContent !== newMetadata.title) {
          const from = 1;
          const to = from + firstNode.content.size;
          editor
            .chain()
            .setTextSelection({ from, to })
            .insertContent(newMetadata.title)
            .run();
        }
      } else {
        editor
          .chain()
          .focus()
          .insertContentAt(0, {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: newMetadata.title }],
          })
          .run();
      }
    }
  }
  if (event.type === 'deleted' && event.item.id === currentState.docId) {
    const findAndLoadReplacementDoc = async () => {
      const allSchemas = (await directoryService.getAllItems()).filter(
        (i) => i.type === 'schema'
      );
      if (allSchemas.length > 0) {
        await loadDocument(allSchemas[0].id);
      } else {
        await createNewDocument(get(t)('document.first_schema_title'));
      }
    };
    findAndLoadReplacementDoc();
  }
});

/**
 * The singleton instance of the document store.
 */
export const documentStore = {
  subscribe,
  loadDocument,
  createNewDocument,
  clearInitialContent,
  updateTitle,
  closeDocument: cleanup,
  clearFocusCommand, // <-- ADDED: Expose the new method in the public API
};
