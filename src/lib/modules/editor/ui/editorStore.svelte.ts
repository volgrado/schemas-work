// src/lib/stores/editorStore.svelte.ts
/**
 * @file Manages the state of the main Tiptap editor instance using Svelte 5 Runes.
 * @store
 */
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

export interface EditorState {
  instance: Editor | null;
  selectedNode: ProseMirrorNode | null;
  selectedNodePos: number | null;
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
 * Import this directly into your components.
 */
export const editorState = $state<EditorState>({ ...initialState });

/**
 * Sets the global Tiptap editor instance.
 */
export function setInstance(editor: Editor): void {
  editorState.instance = editor;
}

/**
 * Updates the currently selected node and its position.
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
 */
export function setDocument(newContent: object): void {
  if (editorState.instance) {
    editorState.instance.commands.setContent(newContent, {
      emitUpdate: true,
    });
    editorState.instance.commands.setTextSelection(0);
  }
}

/**
 * Safely destroys the Tiptap editor instance and resets the store.
 */
export function destroyEditor(): void {
  editorState.instance?.destroy();
  Object.assign(editorState, initialState);
}

/**
 * Signals that the editor's internal state has changed by incrementing
 * a revision counter. This reliably triggers Svelte's reactivity.
 */
export function syncState(): void {
  editorState.revision++;
  console.log(
    `[editorStore] syncState called. New revision: ${editorState.revision}`
  );
}
