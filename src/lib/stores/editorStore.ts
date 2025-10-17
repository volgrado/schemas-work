/**
 * @file Manages the global state of the Tiptap editor instance.
 *
 * @remarks
 * This Svelte store is designed as a global singleton for providing access to the main
 * Tiptap editor instance and its most important derived state, such as the current
 * selection or the full document content. This architectural approach is crucial for
 * decoupling various UI components and services that need to interact with or read data
 * from the editor, without creating tight dependencies on the `DocumentView.svelte`
 * component where the editor instance is physically hosted.
 *
 * For example, the `CommandBar` needs to know which node is currently selected to offer
 * context-specific commands (e.g., "Expand this node"), and the `ttsStore` needs to
 * access the entire document's content to provide its read-aloud functionality. This
 * store serves as the central, decoupled hub for that information.
 *
 * The `DocumentView.svelte` component is the designated "writer" and is responsible for
 * initializing and continuously updating this store's state as the user interacts with the editor.
 */

import { writable } from 'svelte/store';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Defines the structure of the state managed by the global editor store.
 */
export interface EditorStoreState {
  /** The active Tiptap editor instance. It is `null` if no editor has been mounted and initialized. */
  instance: Editor | null;
  /** The document position (numeric index) of the currently selected node. `null` if the selection is a simple cursor or spans multiple nodes. */
  selectedNodePos: number | null;
  /** A version number that increments with each content change, serving as a lightweight and efficient trigger for reactive updates in other parts of the app. */
  contentVersion: number;
  /** The root ProseMirror document node, representing the entire content of the editor. It is `null` if the editor is not yet initialized. */
  doc: ProseMirrorNode | null;
}

/**
 * The initial state for the editor store, used before an editor instance is created and available.
 * @internal
 */
const initialState: EditorStoreState = {
  instance: null,
  selectedNodePos: null,
  contentVersion: 0,
  doc: null,
};

/**
 * A writable Svelte store that holds the single source of truth for the Tiptap editor's state.
 *
 * @remarks
 * This store follows a clear "single writer, multiple readers" pattern:
 *
 * **Writer:**
 * The `DocumentView.svelte` component is the *sole writer* to this store. It is responsible for:
 * - Setting the `instance` when the Tiptap editor is created.
 * - Updating `selectedNodePos`, `doc`, and `contentVersion` whenever the user's selection or the document content changes (i.e., on every transaction).
 *
 * **Readers:**
 * Other components and services throughout the application (e.g., `CommandBar`, `reviewStore`, `ttsStore`, `slashMenuStore`)
 * subscribe to this store to read the editor's state. This allows them to react to changes (like a new node being selected)
 * without being directly or tightly coupled to the `DocumentView` component itself, promoting a cleaner, more maintainable architecture.
 */
export const editorStore = writable<EditorStoreState>(initialState);
