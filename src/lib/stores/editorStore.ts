/**
 * @file Manages the global state of the Tiptap editor instance.
 * @module editorStore
 */

import { writable } from 'svelte/store';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Defines the structure of the state managed by the global editor store.
 */
export interface EditorStoreState {
	/** The active Tiptap editor instance. `null` if no editor is initialized. */
	instance: Editor | null;
	/** The document position of the currently selected node. `null` if the selection is not a node selection. */
	selectedNodePos: number | null;
	/** A version number that increments with each content change, for reactive updates. */
	contentVersion: number;
	/** The root ProseMirror document node. `null` if the editor is not initialized. */
	doc: ProseMirrorNode | null;
}

/**
 * The initial state for the editor store.
 * @internal
 */
const initialState: EditorStoreState = {
	instance: null,
	selectedNodePos: null,
	contentVersion: 0,
	doc: null
};

/**
 * A writable Svelte store that holds the state for the Tiptap editor.
 *
 * @remarks
 * This store follows a "single writer, multiple readers" pattern:
 *
 * - **Writer:** `DocumentView.svelte` is the sole writer, responsible for initializing
 *   and updating the store's state on editor transactions.
 *
 * - **Readers:** Other components and services subscribe to this store to read the
 *   editor's state and react to changes.
 */
export const editorStore = writable<EditorStoreState>(initialState);
