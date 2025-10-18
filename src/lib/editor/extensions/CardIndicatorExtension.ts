// src/lib/editor/extensions/CardIndicatorExtension.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import * as cardService from '$lib/services/features/cardService';
import { cardEditorStore } from '$lib/stores/cardEditorStore';
import type { Unsubscriber } from 'svelte/store';

export const CARD_INDICATOR_PLUGIN_KEY = new PluginKey('cardIndicator');

interface CardIndicatorState {
  nodeIdsWithCards: Set<string>;
}

/**
 * This extension displays a visual indicator on editor nodes that have associated study cards.
 */
export const CardIndicatorExtension = Extension.create({
  name: 'cardIndicator',

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin<CardIndicatorState>({
        key: CARD_INDICATOR_PLUGIN_KEY,
        state: {
          init: (): CardIndicatorState => ({
            nodeIdsWithCards: new Set(),
          }),
          apply(tr, value) {
            const meta = tr.getMeta(CARD_INDICATOR_PLUGIN_KEY);
            if (meta) {
              return { ...value, ...meta };
            }
            // We map the decorations if the document changes so they are not lost.
            if (tr.docChanged) {
              // We simply return the value; the decorations will be recalculated in `props.decorations`
            }
            return value;
          },
        },
        view() {
          let cardStoreUnsubscriber: Unsubscriber;
          let lastIsOpen: boolean | undefined = undefined;

          const updateNodeIds = async () => {
            const { view } = extensionThis.editor;
            if (view.isDestroyed) return;

            const allCards = await cardService.getAllCards();
            const nodeIds = new Set(allCards.map((card) => card.nodeId));

            const currentState = this.getState(view.state);
            if (
              currentState &&
              setsAreEqual(currentState.nodeIdsWithCards, nodeIds)
            ) {
              return; // No changes, we do nothing.
            }

            const tr = view.state.tr.setMeta(CARD_INDICATOR_PLUGIN_KEY, {
              nodeIdsWithCards: nodeIds,
            });
            view.dispatch(tr);
          };

          // *** START OF THE SOLUTION: Initial load with delay ***
          // We wait a moment to ensure that the NodeIdExtension
          // has had time to assign the initial IDs.
          setTimeout(updateNodeIds, 100);
          // *** END OF THE SOLUTION ***

          // We subscribe to changes in the card editor
          cardStoreUnsubscriber = cardEditorStore.subscribe((storeState) => {
            // If the panel has just been closed, we update the indicators.
            if (lastIsOpen === true && !storeState.isOpen) {
              updateNodeIds();
            }
            lastIsOpen = storeState.isOpen;
          });

          return {
            destroy() {
              cardStoreUnsubscriber();
            },
          };
        },
        props: {
          decorations(state) {
            const pluginState = this.getState(state);
            if (!pluginState || pluginState.nodeIdsWithCards.size === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            const { doc } = state;
            const { nodeIdsWithCards } = pluginState;

            doc.descendants((node, pos) => {
              if (
                node.type.name === 'listItem' &&
                node.attrs.nodeId &&
                nodeIdsWithCards.has(node.attrs.nodeId)
              ) {
                const firstParagraph = node.firstChild;
                if (firstParagraph) {
                  // We position the icon at the end of the first paragraph (the term).
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

function setsAreEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
