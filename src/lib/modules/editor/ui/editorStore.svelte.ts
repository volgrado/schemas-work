// src/lib/stores/editorStore.svelte.ts
/**
 * @file editorStore.svelte.ts
 * @module editor
 * @description
 * Manages the global state of the Tiptap editor instance using Svelte 5 Runes.
 *
 * This store acts as the bridge between the imperative Tiptap API and the reactive
 * Svelte application. It holds the reference to the editor instance, tracks selection
 * state, and provides a reactivity mechanism (via the `revision` counter) to ensure
 * Svelte components update when the editor's internal state changes.
 */

import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Defines the shape of the editor's reactive state.
 */
export interface EditorState {
  /** The raw Tiptap Editor instance. */
  instance: Editor | null;
  /** The currently selected ProseMirror node (if any). */
  selectedNode: ProseMirrorNode | null;
  /** The position of the currently selected node in the document. */
  selectedNodePos: number | null;
  /**
   * A counter that increments on every transaction.
   * Use this in `$derived` runes to force re-evaluation when the editor state changes.
   */
  revision: number;
}

const initialState: EditorState = {
  instance: null,
  selectedNode: null,
  selectedNodePos: null,
  revision: 0,
};

/**
 * The reactive state object for the editor.
 * Components should import this directly to access `editorState.instance`.
 */
export const editorState = $state<EditorState>({ ...initialState });

// --- Actions ---

/**
 * Sets the global Tiptap editor instance.
 * This should be called once when the `Editor` component mounts.
 * @param editor - The initialized Tiptap Editor instance.
 */
export function setInstance(editor: Editor): void {
  editorState.instance = editor;
}

/**
 * Updates the currently selected node and its position.
 * This is typically called from the editor's `selectionUpdate` event.
 * @param node - The selected ProseMirror node (or null).
 * @param pos - The start position of the selection.
 */
export function updateSelection(
  node: ProseMirrorNode | null,
  pos: number | null
): void {
  editorState.selectedNode = node;
  editorState.selectedNodePos = pos;
}

/**
 * Replaces the entire content of the active editor with new Tiptap JSON.
 * This operation is undoable and emits an update event.
 * @param newContent - The valid Tiptap JSON object.
 */
export function setDocument(newContent: object): void {
  if (editorState.instance) {
    editorState.instance.commands.setContent(newContent, {
      emitUpdate: true,
    });
    // Reset selection to the start of the document
    editorState.instance.commands.setTextSelection(0);
  }
}

/**
 * Safely destroys the Tiptap editor instance and resets the store to its initial state.
 * Call this when the editor component is unmounted to prevent memory leaks.
 */
export function destroyEditor(): void {
  editorState.instance?.destroy();
  Object.assign(editorState, initialState);
}

/**
 * Signals that the editor's internal state has changed by incrementing the revision counter.
 * This is crucial for binding Svelte's reactivity system to Tiptap's event loop.
 * Call this on Tiptap's `transaction` or `update` events.
 */
export function syncState(): void {
  editorState.revision++;
  if (import.meta.env.DEV) {
    // console.log(`[editorStore] syncState called. New revision: ${editorState.revision}`);
  }
}
