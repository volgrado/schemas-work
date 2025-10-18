/**
 * @file Manages the lifecycle, state, and persistence of the active schema document.
 * @module documentStore
 *
 * @remarks
 * This store is the heart of the application's state management. It is responsible for the entire
 * lifecycle of the currently active document, from loading it from storage, making it available to
 * the editor, and handling its eventual cleanup. It serves as the single source of truth for all
 * information about the *active* document.
 *
 * ### Architectural Role
 *
 * - **Central Document Hub**: This store holds the live `Y.Doc` instance, which is the collaborative
 *   real-time data structure (CRDT) that powers the editor. All other parts of the application
 *   that need to interact with the document's content or metadata (like the editor itself, the
 *   title bar, etc.) do so by subscribing to this store.
 *
 * - **Lifecycle Management**: It provides the core functions for document lifecycle: `loadDocument`,
 *   `createNewDocument`, and the internal `cleanup` function. When a new document is loaded,
 *   this store orchestrates the process of tearing down the old document's persistence connection
 *   and setting up the new one. This is crucial for preventing memory leaks and ensuring data
 *   integrity.
 *
 * - **Bridge to Persistence**: The store collaborates with `persistenceService` to get a
 *   `DocumentProvider` (which bundles the `Y.Doc` and its `IndexeddbPersistence` layer). It waits for
 *   the provider to be synced (`provider.whenSynced`) before marking the document as 'ready'. This
 *   ensures that the editor doesn't receive the document until its initial state has been fully
 *   loaded from IndexedDB, preventing content flashing or data loss.
 *
 * - **Reactive to External Changes**: The store subscribes to `directoryEvents`. This is a powerful
 *   decoupling mechanism. If another part of the application (e.g., a file browser UI) renames or
 *   deletes the currently active document, the `directoryService` will emit an event. This store
 *   listens for those events and reacts accordingly: updating the title in the store if the document
 *   is renamed, or loading a new document if the active one is deleted. This prevents the UI from
 *   becoming stale or inconsistent.
 *
 * - **Optimistic Updates**: The `updateTitle` function demonstrates an optimistic UI update. The local
 *   `metadata` in the store is updated immediately, providing instant feedback to the user. The
 *   asynchronous call to `directoryService.updateItemMetadata` then proceeds. If it fails, the
 *   store reverts the change, ensuring the UI remains consistent with the backend state.
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

/**
 * Represents the detailed state of the active document.
 */
export interface DocumentStoreState {
	/** The unique ID of the currently loaded document. */
	docId: string | null;
	/** The metadata for the document (e.g., title). */
	metadata: SchemaMetadata | null;
	/** The Y.js document instance (CRDT). */
	ydoc: Y.Doc | null;
	/** The persistence provider (syncs ydoc to IndexedDB). */
	provider: IndexeddbPersistence | null;
	/** The current loading status of the document. */
	status: 'idle' | 'loading' | 'ready' | 'error';
	/** Initial content to populate a newly created document. */
	initialContent?: object;
}

/**
 * The initial state of the document store.
 * @internal
 */
const initialState: DocumentStoreState = {
	docId: null,
	metadata: null,
	ydoc: null,
	provider: null,
	status: 'idle',
	initialContent: undefined
};

const _documentStore: Writable<DocumentStoreState> = writable(initialState);
const { subscribe, update, set } = _documentStore;

/**
 * Cleans up resources for the active document, destroying the persistence provider.
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
 * @param docId The unique ID of the document to load.
 */
async function loadDocument(docId: string): Promise<void> {
	cleanup();
	update((state) => ({ ...state, status: 'loading' }));

	try {
		const MIN_LOADING_TIME = 300; // ms
		const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME));

		const loadData = async () => {
			const metadata = await directoryService.getItemById(docId);
			if (!metadata || metadata.type !== 'schema') {
				throw new Error(t('document.invalid_document_error', { docId }));
			}
			const { ydoc, provider } = getDocumentProvider(docId);
			await provider.whenSynced;
			return { metadata, ydoc, provider };
		};

		const [loadedData] = await Promise.all([loadData(), minDelay]);

		set({
			docId,
			metadata: loadedData.metadata,
			ydoc: loadedData.ydoc,
			provider: loadedData.provider,
			status: 'ready',
			initialContent: undefined
		});

		await directoryService.setLastActiveDocId(docId);
	} catch (error) {
		errorService.reportError(error, { operation: 'loadDocument', docId });
		set({ ...initialState, status: 'error' });
	}
}

/**
 * Creates a new document with a given title and optional initial content.
 * @param [title='New Schema'] The title for the new document.
 * @param [content] Optional ProseMirror JSON object to populate the document.
 * @param [parentId=null] Optional ID of the parent folder.
 * @returns The metadata of the new document.
 */
async function createNewDocument(
	title: string = t('document.new_schema_title'),
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
					content: [{ type: 'text', text: title }]
				}
			]
		};

		set({
			docId: newMetadata.id,
			metadata: newMetadata,
			ydoc,
			provider,
			status: 'ready',
			initialContent: finalInitialContent
		});

		await directoryService.setLastActiveDocId(newMetadata.id);
		return newMetadata;
	} catch (error) {
		errorService.reportError(error, { operation: 'createNewDocument', title, parentId });
		set({ ...initialState, status: 'error' });
		throw error;
	}
}

/**
 * Clears the `initialContent` from the state once consumed by the editor.
 */
function clearInitialContent(): void {
	update((state) => {
		if (state.initialContent) {
			return { ...state, initialContent: undefined };
		}
		return state;
	});
}

/**
 * Updates the title of the current document.
 * @param newTitle The new title for the document.
 */
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

directoryEvents.subscribe((event) => {
	if (!event) return;

	const currentState = get(_documentStore);
	if (!currentState.docId) return;

	if (event.type === 'updated' && event.item.id === currentState.docId) {
		const newMetadata = event.item as SchemaMetadata;
		update((state) => ({ ...state, metadata: newMetadata }));

		const editor = get(editorStore).instance;
		if (editor && newMetadata.title !== currentState.metadata?.title) {
			const { doc } = editor.state;
			const firstNode = doc.firstChild;

			if (firstNode && firstNode.type.name === 'heading' && firstNode.attrs.level === 1) {
				if (firstNode.textContent !== newMetadata.title) {
					const from = 1;
					const to = from + firstNode.content.size;
					editor.chain().setTextSelection({ from, to }).insertContent(newMetadata.title).run();
				}
			} else {
				editor.chain().focus().insertContentAt(0, {
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: newMetadata.title }]
				}).run();
			}
		}
	}

	if (event.type === 'deleted' && event.item.id === currentState.docId) {
		const findAndLoadReplacementDoc = async () => {
			const allSchemas = (await directoryService.getAllItems()).filter((i) => i.type === 'schema');
			if (allSchemas.length > 0) {
				await loadDocument(allSchemas[0].id);
			} else {
				await createNewDocument(t('document.first_schema_title'));
			}
		};
		findAndLoadReplacementDoc();
	}
});

/**
 * The singleton instance of the document store.
 */
export const documentStore = {
	/** Subscribes to changes in the document store's state. */
	subscribe,
	/** Loads a document by its unique ID. */
	loadDocument,
	/** Creates a new document and loads it. */
	createNewDocument,
	/** Clears the initial content flag after it has been consumed by the editor. */
	clearInitialContent,
	/** Updates the title of the currently active document. */
	updateTitle
};
