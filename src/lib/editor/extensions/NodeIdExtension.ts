// src/lib/editor/extensions/NodeIdExtension.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { v4 as uuidv4 } from 'uuid';

/**
 * This extension ensures that every 'listItem' node has a unique and persistent `nodeId`.
 * This ID is the critical link between the visual node in the editor and its associated
 * data, such as study cards, in external services or databases.
 */
export const NodeIdExtension = Extension.create({
  name: 'nodeId',

  /**
   * We add `nodeId` as a global attribute to the `listItem` nodes.
   */
  addGlobalAttributes() {
    return [
      {
        types: ['listItem'],
        attributes: {
          nodeId: {
            default: null,
            // Defines how the attribute is read from and written to the HTML representation.
            parseHTML: (element) => element.getAttribute('data-node-id'),
            renderHTML: (attributes) => {
              if (!attributes.nodeId) {
                return {};
              }
              return { 'data-node-id': attributes.nodeId };
            },
          },
        },
      },
    ];
  },

  // *** INICIO DE LA SOLUCIÓN: onCreate Hook ***
  // Se ejecuta una sola vez cuando el editor es creado.
  onCreate() {
    const { tr } = this.editor.state;
    let modified = false;

    // Recorremos el documento inicial.
    this.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'listItem' && !node.attrs.nodeId) {
        // Si un 'listItem' no tiene ID, se lo asignamos inmediatamente.
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          nodeId: uuidv4(),
        });
        modified = true;
      }
    });

    // Si hemos modificado algo, aplicamos la transacción.
    if (modified) {
      this.editor.view.dispatch(tr);
    }
  },
  // *** FIN DE LA SOLUCIÓN ***

  /**
   * We add a ProseMirror plugin to automatically assign an ID to any `listItem` that doesn't have one.
   * This is a "self-healing" mechanism that guarantees data integrity.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('nodeIdPlugin'),
        // `appendTransaction` is called for every transaction that occurs in the editor.
        appendTransaction: (transactions, oldState, newState) => {
          // If the document hasn't changed, we don't need to do anything.
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const tr = newState.tr;
          let modified = false;

          // We iterate over all nodes in the new state of the document.
          newState.doc.descendants((node, pos) => {
            // We are only interested in 'listItem' nodes.
            if (node.type.name === 'listItem') {
              // If a node is missing the `nodeId` attribute...
              if (!node.attrs.nodeId) {
                // ...we generate a new UUID for it.
                const newId = uuidv4();
                // We create a markup change in the transaction to add the ID.
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  nodeId: newId,
                });
                modified = true;
              }
            }
          });

          // If we made any changes, we return the modified transaction.
          // Otherwise, we return null to indicate that no changes are needed.
          return modified ? tr : null;
        },
      }),
    ];
  },
});
