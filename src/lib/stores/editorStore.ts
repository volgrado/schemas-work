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
 * This store acts as a global singleton providing access to the live Tiptap/ProseMirror
 * editor instance. It is the primary bridge between the Svelte component world and the
 * imperative, object-oriented API of the editor itself.
 *
 * ### Architectural Role
 *
 * - **Decoupling from the Editor Instance**: By placing the editor instance in a global
 *   store, components that need to interact with the editor (e.g., a formatting toolbar,
 *   the slash command menu) do not need to receive the editor instance via props. They can
 *   simply subscribe to this store. This dramatically simplifies component architecture,
 *   avoids prop drilling, and makes it easy for any component to access the editor's state
 *   or execute commands.
 *
 * - **Providing a Reactive "View" of the Editor**: ProseMirror's state is not inherently
 *   reactive in a way that Svelte can understand. This store's state is explicitly updated
 *   on every editor transaction. This creates a reactive "snapshot" of the editor's state.
 *   Key properties that facilitate this:
 *     - `instance`: The raw editor object for running commands (`.chain().focus()...`).
 *     - `doc`: A snapshot of the entire document structure, useful for analysis without
 *       needing the full editor instance.
 *     - `selectedNodePos`: Tracks which node is selected, allowing components like the
 *       `CardEditorPanel` to know what content they are associated with.
 *     - `contentVersion`: This is a simple but effective mechanism. It's a number that
 *       increments on every document change. Components that need to re-render whenever the
 *       *content* of the editor changes (not just the selection) can react to changes in
 *       this specific value.
 *
 * ### The "Single Writer" Pattern
 *
 * This store is intentionally designed to have a single, authoritative writer. The
 * `DocumentView.svelte` component, which is responsible for creating and mounting the Tiptap
 * editor, is the *only* place that should ever write to this store. It listens for editor
 * events (`onTransaction`, `onUpdate`) and updates the store with the latest state.
 * All other parts of the application are consumers (readers) of this state. This clear
 * data flow prevents race conditions and makes the application's behavior predictable.
 */
export const editorStore = writable<EditorStoreState>(initialState);
