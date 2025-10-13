// src/lib/stores/editorStore.ts

import { writable, derived } from 'svelte/store';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model'; // Importamos el tipo

/**
 * Defines the structure of the state that this store will manage.
 * It serves as a global access point to the editor instance
 * and relevant contextual information, such as the selected node.
 */
export interface EditorStoreState {
  /** The Tiptap editor instance. */
  instance: Editor | null;
  /** The position of the currently selected node. */
  selectedNodePos: number | null;
  /** A version number that increments with each content change. */
  contentVersion: number;
  /** The ProseMirror document node. */
  doc: ProseMirrorNode | null;
}

/**
 * The initial state for the editor store.
 */
const initialState: EditorStoreState = {
  instance: null,
  selectedNodePos: null,
  contentVersion: 0,
  doc: null,
};

/**
 * A `writable` store that holds the global state of the editor.
 *
 * The `DocumentView` component is responsible for setting the `instance`
 * when the editor is mounted and for updating `selectedNodePos` when
 * the user's selection changes.
 *
 * Other components and services (CommandBar, reviewStore, ttsStore)
 * subscribe to this store to read the state and act accordingly.
 */
export const editorStore = writable<EditorStoreState>(initialState);

/**
 * A derived store that returns `true` if a node is currently selected in the editor.
 */
export const isNodeSelected = derived(
  editorStore,
  ($editorStore) => $editorStore.selectedNodePos !== null,
);
