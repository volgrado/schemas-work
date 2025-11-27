/**
 * @file Defines the `DynamicHighlighter` Tiptap extension. This extension provides a "dumb"
 * ProseMirror plugin that holds and renders multiple DecorationSets. It is controlled externally
 * by Svelte components, which dispatch transactions with new decoration sets.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';

// A unique key to identify this plugin and its state.
export const DYNAMIC_HIGHLIGHTER_PLUGIN_KEY = new PluginKey(
  'dynamicHighlighter'
);

// The shape of the state managed by this plugin.
// It now holds three distinct sets of decorations.
interface HighlighterState {
  reviewDecorations: DecorationSet;
  ttsDecorations: DecorationSet;
  ttsWordDecorations: DecorationSet;
}

export const DynamicHighlighter = Extension.create({
  name: 'dynamicHighlighter',

  addProseMirrorPlugins(): Plugin<HighlighterState>[] {
    return [
      new Plugin<HighlighterState>({
        key: DYNAMIC_HIGHLIGHTER_PLUGIN_KEY,

        // The plugin's state.
        state: {
          // Initialize all three sets as empty.
          init: (): HighlighterState => ({
            reviewDecorations: DecorationSet.empty,
            ttsDecorations: DecorationSet.empty,
            ttsWordDecorations: DecorationSet.empty,
          }),

          // The ONLY way to change the state is by applying a transaction.
          apply(tr: Transaction, oldState: HighlighterState): HighlighterState {
            // Look for our specific metadata on the transaction.
            const meta = tr.getMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY);
            if (meta) {
              // If metadata exists, merge it into the state.
              return { ...oldState, ...meta };
            }

            // If no metadata, just map the old decorations over the transaction
            // to ensure they stay in the correct place if the document is edited.
            return {
              reviewDecorations: oldState.reviewDecorations.map(
                tr.mapping,
                tr.doc
              ),
              ttsDecorations: oldState.ttsDecorations.map(tr.mapping, tr.doc),
              ttsWordDecorations: oldState.ttsWordDecorations.map(
                tr.mapping,
                tr.doc
              ),
            };
          },
        },

        // The plugin's props.
        props: {
          // This tells ProseMirror what to draw in the editor.
          decorations(state: EditorState): DecorationSet | undefined {
            const pluginState = this.getState(state);
            if (!pluginState) return;

            // 1. Get the raw arrays of decorations from all three sets.
            const reviewDecos = pluginState.reviewDecorations.find();
            const ttsNodeDecos = pluginState.ttsDecorations.find();
            const ttsWordDecos = pluginState.ttsWordDecorations.find();

            // 2. Combine them into a single array.
            const allDecorations = [
              ...reviewDecos,
              ...ttsNodeDecos,
              ...ttsWordDecos,
            ];

            // 3. Create a new DecorationSet from the combined array and return it.
            //    This allows all highlights (review, node, and word) to be displayed simultaneously.
            if (allDecorations.length > 0) {
              return DecorationSet.create(state.doc, allDecorations);
            }

            return; // Return undefined if there's nothing to draw
          },
        },
      }),
    ];
  },
});
