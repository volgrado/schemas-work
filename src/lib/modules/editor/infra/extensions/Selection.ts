/**
 * @file Selection.ts
 * @extension
 *
 * @description
 * This custom Tiptap extension provides the `onSelectionUpdate` event hook.
 * It is a lightweight, self-contained replacement for the official @tiptap/extension-selection.
 *
 * It works by creating a ProseMirror plugin that inspects every transaction. If a
 * transaction changes the selection state, it triggers the `onSelectionUpdate` callback.
 * Using `appendTransaction` makes it highly performant for this specific task.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { Editor } from '@tiptap/core';

// Define the shape of the options this extension accepts.
export interface SelectionOptions {
  onSelectionUpdate: (props: { editor: Editor }) => void;
}

export const Selection = Extension.create<SelectionOptions>({
  name: 'selection',

  addOptions() {
    return {
      // The callback does nothing by default, preventing errors if not provided.
      onSelectionUpdate: () => {},
    };
  },

  // This is the core of the extension. It adds a ProseMirror plugin.
  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin({
        key: new PluginKey('selection'),

        // REFINEMENT: Use `appendTransaction` for a more performant and modern approach.
        // This hook is ideal for reacting to state changes without directly manipulating the view.
        appendTransaction: (transactions, oldState, newState) => {
          // If the selection has not changed between states, do nothing.
          if (oldState.selection.eq(newState.selection)) {
            return null;
          }

          // A more specific check: we are interested in transactions where the selection
          // was explicitly set, which is a strong indicator of a user-driven change.
          const selectionHasChanged = transactions.some(
            (tr) => tr.selectionSet
          );

          if (selectionHasChanged) {
            // Trigger the callback function that was passed in via the options.
            extensionThis.options.onSelectionUpdate({
              editor: extensionThis.editor,
            });
          }

          // We are not modifying the transaction, so we return null.
          return null;
        },
      }),
    ];
  },
});
