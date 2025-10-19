/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { editorStore, type EditorStoreState } from './editorStore';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

// A minimal mock of a Tiptap Editor for state storage purposes
const mockEditor = {
  isDestroyed: false,
  state: {
    /* ... */
  },
} as unknown as Editor;

// A minimal mock of a ProseMirror Node
const mockDocNode: ProseMirrorNode = {
  type: { name: 'doc' },
  textContent: 'Initial document content',
} as unknown as ProseMirrorNode;

const mockSelectedNode: ProseMirrorNode = {
  type: { name: 'paragraph' },
  textContent: 'A selected paragraph',
} as unknown as ProseMirrorNode;

describe('editorStore', () => {
  beforeEach(() => {
    // Reset the store to its full initial state before each test
    editorStore.set({
      instance: null,
      selectedNodePos: null,
      selectedNode: null,
      contentVersion: 0,
      doc: null,
    });
  });

  it('should have a correct initial state', () => {
    const state = get(editorStore);
    expect(state.instance).toBeNull();
    expect(state.selectedNodePos).toBeNull();
    expect(state.selectedNode).toBeNull();
    expect(state.contentVersion).toBe(0);
    expect(state.doc).toBeNull();
  });

  describe('State Management', () => {
    it('should allow setting the complete editor state', () => {
      const newState: EditorStoreState = {
        instance: mockEditor,
        selectedNodePos: null,
        selectedNode: null,
        contentVersion: 1,
        doc: mockDocNode,
      };

      editorStore.set(newState);

      const state = get(editorStore);
      expect(state.instance).toBe(mockEditor);
      expect(state.doc).toBe(mockDocNode);
      expect(state.contentVersion).toBe(1);
      expect(state.selectedNode).toBeNull();
    });

    it('should allow updating the state for a content change', () => {
      // First, set an initial state
      editorStore.set({
        instance: mockEditor,
        selectedNodePos: null,
        selectedNode: null,
        contentVersion: 1,
        doc: mockDocNode,
      });

      const updatedDocNode = {
        ...mockDocNode,
        textContent: 'Updated content',
      } as unknown as ProseMirrorNode;

      // Simulate the "writer" (e.g., DocumentView.svelte) updating the store after a transaction
      editorStore.update((current) => ({
        ...current,
        doc: updatedDocNode,
        contentVersion: current.contentVersion + 1,
      }));

      const state = get(editorStore);
      expect(state.doc).toBe(updatedDocNode);
      expect(state.contentVersion).toBe(2);
    });

    it('should allow updating the state for a node selection change', () => {
      // First, set an initial state
      editorStore.set({
        instance: mockEditor,
        selectedNodePos: null,
        selectedNode: null,
        contentVersion: 1,
        doc: mockDocNode,
      });

      // Simulate a node selection
      editorStore.update((current) => ({
        ...current,
        selectedNodePos: 42,
        selectedNode: mockSelectedNode,
      }));

      const state = get(editorStore);
      expect(state.selectedNodePos).toBe(42);
      expect(state.selectedNode).toBe(mockSelectedNode);
      // Content version should not change on selection
      expect(state.contentVersion).toBe(1);
    });

    it('should allow clearing the selection', () => {
      // Set a state with a selection
      editorStore.set({
        instance: mockEditor,
        selectedNodePos: 42,
        selectedNode: mockSelectedNode,
        contentVersion: 1,
        doc: mockDocNode,
      });

      // Simulate clearing the selection
      editorStore.update((current) => ({
        ...current,
        selectedNodePos: null,
        selectedNode: null,
      }));

      const state = get(editorStore);
      expect(state.selectedNodePos).toBeNull();
      expect(state.selectedNode).toBeNull();
    });
  });
});
