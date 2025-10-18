// src/lib/editor/extensions/CardIndicatorExtension.ts
/**
 * @file This file defines the `CardIndicatorExtension` for the Tiptap editor.
 * This extension is responsible for displaying a visual indicator next to any editor
 * node that has one or more associated study cards.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import * as cardService from '$lib/services/features/cardService';
import { cardEditorStore } from '$lib/stores/cardEditorStore';
import type { Unsubscriber } from 'svelte/store';

/**
 * The unique key for the ProseMirror plugin, used to identify it within the editor state.
 * @constant
 */
export const CARD_INDICATOR_PLUGIN_KEY = new PluginKey('cardIndicator');

/**
 * Defines the state managed by the CardIndicator plugin.
 */
interface CardIndicatorState {
  /**
   * A set of `nodeId`s for all nodes that currently have associated cards.
   * This is used to efficiently check if a node should get an indicator.
   */
  nodeIdsWithCards: Set<string>;
}

/**
 * @description The `CardIndicatorExtension` is a Tiptap extension that adds a visual cue
 * (an icon) to nodes within the editor that are linked to study cards.
 *
 * This is accomplished using a ProseMirror plugin that:
 * 1. Fetches all cards from the `cardService`.
 * 2. Manages a state containing the set of all `nodeId`s that have cards.
 * 3. Subscribes to the `cardEditorStore` to update the indicators whenever the card editor is closed.
 * 4. Creates ProseMirror `Decoration` widgets to render the indicator icon next to the relevant nodes.
 */
export const CardIndicatorExtension = Extension.create({
  name: 'cardIndicator',

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin<CardIndicatorState>({
        key: CARD_INDICATOR_PLUGIN_KEY,
        state: {
          /**
           * Initializes the plugin's state with an empty set of node IDs.
           */
          init: (): CardIndicatorState => ({
            nodeIdsWithCards: new Set(),
          }),
          /**
           * Applies state changes. The state is updated when a transaction contains
           * metadata from this plugin's key.
           */
          apply(tr, value) {
            const meta = tr.getMeta(CARD_INDICATOR_PLUGIN_KEY);
            if (meta) {
              return { ...value, ...meta };
            }
            return value;
          },
        },
        /**
         * The plugin's view component, which handles its lifecycle and interactions.
         */
        view() {
          let cardStoreUnsubscriber: Unsubscriber;
          let lastIsOpen: boolean | undefined = undefined;

          /**
           * Asynchronously fetches all cards and dispatches a transaction to update the
           * plugin state with the set of node IDs that have cards.
           */
          const updateNodeIds = async () => {
            const { view } = extensionThis.editor;
            if (view.isDestroyed) return;

            const allCards = await cardService.getAllCards();
            const nodeIds = new Set(allCards.map((card) => card.nodeId));

            const currentState = CARD_INDICATOR_PLUGIN_KEY.getState(view.state);
            if (
              currentState &&
              setsAreEqual(currentState.nodeIdsWithCards, nodeIds)
            ) {
              return; // No changes, do nothing.
            }

            const tr = view.state.tr.setMeta(CARD_INDICATOR_PLUGIN_KEY, {
              nodeIdsWithCards: nodeIds,
            });
            view.dispatch(tr);
          };

          // Initial load: We wait briefly to ensure the NodeIdExtension has assigned IDs.
          setTimeout(updateNodeIds, 100);

          // Subscribe to the card editor store to detect when the editor is closed.
          cardStoreUnsubscriber = cardEditorStore.subscribe((storeState) => {
            if (lastIsOpen === true && !storeState.isOpen) {
              updateNodeIds(); // Update indicators when the card editor closes.
            }
            lastIsOpen = storeState.isOpen;
          });

          return {
            /**
             * Cleans up the store subscription when the plugin view is destroyed.
             */
            destroy() {
              cardStoreUnsubscriber();
            },
          };
        },
        props: {
          /**
           * Creates and returns the decoration set for the entire document.
           * This is where the visual indicators are actually created and positioned.
           */
          decorations(state) {
            const pluginState = this.getState(state);
            if (!pluginState || pluginState.nodeIdsWithCards.size === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            const { doc } = state;
            const { nodeIdsWithCards } = pluginState;

            // Traverse the document to find nodes that need an indicator.
            doc.descendants((node, pos) => {
              if (
                node.type.name === 'listItem' &&
                node.attrs.nodeId &&
                nodeIdsWithCards.has(node.attrs.nodeId)
              ) {
                const firstParagraph = node.firstChild;
                if (firstParagraph) {
                  // Position the widget at the end of the term's paragraph.
                  const widgetPos = pos + 1 + firstParagraph.nodeSize;
                  const icon = document.createElement('span');
                  icon.className = 'card-indicator-icon';
                  icon.setAttribute('aria-label', 'Has cards');
                  decorations.push(
                    Decoration.widget(widgetPos, icon, { side: 1 })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

/**
 * Compares two sets for equality.
 * @internal
 */
function setsAreEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
