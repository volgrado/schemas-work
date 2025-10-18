// src/lib/editor/extensions/DynamicHighlighter.ts
/**
 * @file Defines the `DynamicHighlighter` Tiptap extension, which is responsible for applying
 * dynamic CSS classes to the editor content in response to changes in external Svelte stores.
 * This allows the editor to visually reflect the application's state, such as highlighting
 * text being read aloud or words being reviewed.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';
import { reviewStore, type ReviewState } from '@/stores/reviewStore';
import { ttsStore, type TTSState } from '@/stores/ttsStore';
import type { Unsubscriber } from 'svelte/store';

/**
 * The unique key for the ProseMirror plugin.
 * @constant
 */
export const DYNAMIC_HIGHLIGHTER_PLUGIN_KEY = new PluginKey(
  'dynamicHighlighter'
);

/**
 * Defines the state managed by the DynamicHighlighter plugin.
 */
interface HighlighterState {
  /** The set of decorations for the review feature. */
  reviewDecorations: DecorationSet;
  /** The set of decorations for the text-to-speech (TTS) feature. */
  ttsDecorations: DecorationSet;
}

/**
 * @description The `DynamicHighlighter` extension integrates Svelte stores with the Tiptap editor
 * to apply visual styles dynamically. It uses a stateful ProseMirror plugin that subscribes to
 * `reviewStore` and `ttsStore`.
 *
 * When these stores emit new `DecorationSet`s, the plugin updates its internal state and triggers
 * a re-render of the editor, applying the new CSS classes. This provides an efficient and stable
 * way to bridge Svelte's reactivity with ProseMirror's rendering system.
 */
export const DynamicHighlighter = Extension.create({
  name: 'dynamicHighlighter',

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin<HighlighterState>({
        key: DYNAMIC_HIGHLIGHTER_PLUGIN_KEY,

        /**
         * The plugin's internal state, which caches the latest decoration sets from the stores.
         */
        state: {
          init: (): HighlighterState => ({
            reviewDecorations: DecorationSet.empty,
            ttsDecorations: DecorationSet.empty,
          }),
          /**
           * Updates the state if a transaction includes metadata for this plugin.
           */
          apply(tr, value): HighlighterState {
            const meta = tr.getMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY);
            if (meta) {
              return { ...value, ...meta };
            }
            return value;
          },
        },

        /**
         * The plugin's view, which connects it to the outside world (Svelte stores).
         */
        view() {
          let reviewUnsubscriber: Unsubscriber;
          let ttsUnsubscriber: Unsubscriber;

          /**
           * Handles updates from the `reviewStore`, dispatching a transaction to update
           * the plugin state with the new review decorations.
           */
          const handleReviewUpdate = (state: ReviewState) => {
            const { view } = extensionThis.editor;
            if (view.isDestroyed) return;

            const tr = view.state.tr.setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, {
              reviewDecorations: state.decorationSet,
            });
            view.dispatch(tr);
          };

          /**
           * Handles updates from the `ttsStore`, dispatching a transaction to update
           * the plugin state with the new TTS decorations.
           */
          const handleTtsUpdate = (state: TTSState) => {
            const { view } = extensionThis.editor;
            if (view.isDestroyed) return;

            const tr = view.state.tr.setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, {
              ttsDecorations: state.decorationSet,
            });
            view.dispatch(tr);
          };

          // Subscribe to the stores when the plugin view is created.
          reviewUnsubscriber = reviewStore.subscribe(handleReviewUpdate);
          ttsUnsubscriber = ttsStore.subscribe(handleTtsUpdate);

          return {
            /**
             * Unsubscribes from the stores when the plugin view is destroyed to prevent memory leaks.
             */
            destroy() {
              reviewUnsubscriber();
              ttsUnsubscriber();
            },
          };
        },

        /**
         * Exposes the plugin's state to ProseMirror's rendering engine.
         */
        props: {
          /**
           * This function is called by ProseMirror whenever the editor needs to be redrawn.
           * It returns the final set of decorations to be displayed.
           */
          decorations(state: EditorState) {
            const pluginState = this.getState(state);
            if (!pluginState) return null;

            const { reviewDecorations, ttsDecorations } = pluginState;

            // The review highlight takes precedence over the TTS highlight.
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
