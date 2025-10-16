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
 * Esta extensión muestra un indicador visual en los nodos del editor que tienen tarjetas de estudio asociadas.
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
            // Mapeamos las decoraciones si el documento cambia para que no se pierdan.
            if (tr.docChanged) {
              // Simplemente retornamos el valor, las decoraciones se recalcularán en `props.decorations`
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
              return; // No hay cambios, no hacemos nada.
            }

            const tr = view.state.tr.setMeta(CARD_INDICATOR_PLUGIN_KEY, {
              nodeIdsWithCards: nodeIds,
            });
            view.dispatch(tr);
          };

          // *** INICIO DE LA SOLUCIÓN: Carga inicial con retraso ***
          // Esperamos un instante para asegurar que la extensión NodeIdExtension
          // haya tenido tiempo de asignar los IDs iniciales.
          setTimeout(updateNodeIds, 100);
          // *** FIN DE LA SOLUCIÓN ***

          // Nos suscribimos a los cambios en el editor de tarjetas
          cardStoreUnsubscriber = cardEditorStore.subscribe((storeState) => {
            // Si el panel se acaba de cerrar, actualizamos los indicadores.
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
                  // Posicionamos el icono al final del primer párrafo (el término).
                  const widgetPos = pos + 1 + firstParagraph.nodeSize;
                  const icon = document.createElement('span');
                  icon.className = 'card-indicator-icon';
                  icon.setAttribute('aria-label', 'Tiene tarjetas');
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
