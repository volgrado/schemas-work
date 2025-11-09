/**
 * @file Defines the `DynamicHighlighter` Tiptap extension. This extension provides a "dumb"
 * ProseMirror plugin that simply holds and renders DecorationSets. It is controlled externally
 * by a Svelte component, which dispatches transactions with new decoration sets.
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
interface HighlighterState {
  reviewDecorations: DecorationSet;
  ttsDecorations: DecorationSet;
}

export const DynamicHighlighter = Extension.create({
  name: 'dynamicHighlighter',

  addProseMirrorPlugins(): Plugin<HighlighterState>[] {
    return [
      new Plugin<HighlighterState>({
        key: DYNAMIC_HIGHLIGHTER_PLUGIN_KEY,

        // The plugin's state.
        state: {
          // Initialize with empty sets.
          init: (): HighlighterState => ({
            reviewDecorations: DecorationSet.empty,
            ttsDecorations: DecorationSet.empty,
          }),

          // The ONLY way to change the state is by applying a transaction.
          apply(tr: Transaction, oldState: HighlighterState): HighlighterState {
            // Look for our specific metadata on the transaction.
            const meta = tr.getMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY);
            if (meta) {
              // If metadata exists, merge it into the state.
              return { ...oldState, ...meta };
            }

            // If no metadata, just map the old decorations over the transaction.
            return {
              reviewDecorations: oldState.reviewDecorations.map(
                tr.mapping,
                tr.doc
              ),
              ttsDecorations: oldState.ttsDecorations.map(tr.mapping, tr.doc),
            };
          },
        },

        // The plugin's props.
        props: {
          // This tells ProseMirror what to draw in the editor.
          decorations(state: EditorState): DecorationSet | null {
            const pluginState = this.getState(state);
            if (!pluginState) return null;

            // Prioritize review decorations over TTS decorations.
            if (pluginState.reviewDecorations.find().length > 0) {
              return pluginState.reviewDecorations;
            }
            if (pluginState.ttsDecorations.find().length > 0) {
              return pluginState.ttsDecorations;
            }
            return null;
          },
        },
      }),
    ];
  },
});
