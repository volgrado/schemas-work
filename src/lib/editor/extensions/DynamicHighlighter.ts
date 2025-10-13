// src/lib/editor/extensions/DynamicHighlighter.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';
import { reviewStore, type ReviewState } from '$lib/stores/reviewStore';
import { ttsStore, type TTSState } from '$lib/stores/ttsStore';
import type { Unsubscriber } from 'svelte/store';

export const DYNAMIC_HIGHLIGHTER_PLUGIN_KEY = new PluginKey(
  'dynamicHighlighter'
);

interface HighlighterState {
  reviewDecorations: DecorationSet;
  ttsDecorations: DecorationSet;
}

/**
 * A robust Tiptap extension that applies dynamic decorations (CSS classes)
 * to the editor content in response to external Svelte stores.
 *
 * This version uses a stateful ProseMirror plugin that subscribes to stores,
 * providing a more efficient and stable integration between Tiptap and Svelte's
 * reactive system.
 */
export const DynamicHighlighter = Extension.create({
  name: 'dynamicHighlighter',

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin<HighlighterState>({
        key: DYNAMIC_HIGHLIGHTER_PLUGIN_KEY,

        // The plugin's internal state, which holds the latest decorations.
        state: {
          init: (): HighlighterState => {
            return {
              reviewDecorations: DecorationSet.empty,
              ttsDecorations: DecorationSet.empty,
            };
          },
          apply(tr, value): HighlighterState {
            const meta = tr.getMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY);
            if (meta) {
              return { ...value, ...meta };
            }
            return value;
          },
        },

        // The view portion of the plugin connects to the outside world.
        view() {
          let reviewUnsubscriber: Unsubscriber;
          let ttsUnsubscriber: Unsubscriber;

          const handleReviewUpdate = (state: ReviewState) => {
            const { view } = extensionThis.editor;
            if (view.isDestroyed) return;

            const tr = view.state.tr.setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, {
              reviewDecorations: state.decorationSet,
            });
            view.dispatch(tr);
          };

          const handleTtsUpdate = (state: TTSState) => {
            const { view } = extensionThis.editor;
            if (view.isDestroyed) return;

            const tr = view.state.tr.setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, {
              ttsDecorations: state.decorationSet,
            });
            view.dispatch(tr);
          };

          // Subscribe to stores when the view is created.
          reviewUnsubscriber = reviewStore.subscribe(handleReviewUpdate);
          ttsUnsubscriber = ttsStore.subscribe(handleTtsUpdate);

          return {
            // Unsubscribe when the view is destroyed.
            destroy() {
              reviewUnsubscriber();
              ttsUnsubscriber();
            },
          };
        },

        // Props are used to expose the plugin's state to ProseMirror's rendering.
        props: {
          decorations(state: EditorState) {
            const pluginState = this.getState(state);
            if (!pluginState) return null;

            const { reviewDecorations, ttsDecorations } = pluginState;

            // Prioritize review decorations, then TTS, then apply to the document.
            if (reviewDecorations && reviewDecorations.find().length > 0) {
              return reviewDecorations;
            }
            if (ttsDecorations && ttsDecorations.find().length > 0) {
              return ttsDecorations;
            }
            return null;
          },
        },
      }),
    ];
  },
});
