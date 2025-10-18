// src/lib/editor/extensions/NodeIdExtension.ts
/**
 * @file Implements the `NodeIdExtension` for the Tiptap editor. This extension is critical
 * for ensuring data persistence and integrity by assigning a unique and stable identifier
 * (`nodeId`) to every `listItem` node.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { v4 as uuidv4 } from 'uuid';

/**
 * @description The `NodeIdExtension` ensures that every `listItem` node in the editor schema
 * has a unique `nodeId` attribute. This ID serves as a stable reference to the node, allowing
 * external services (like study card management) to associate data with a specific piece of content.
 *
 * The extension employs a two-fold strategy:
 * 1. An `onCreate` hook to scan the initial document and assign IDs to any `listItem` nodes that lack them.
 * 2. A ProseMirror plugin using `appendTransaction` to automatically assign IDs to new `listItem` nodes
 *    as they are created, providing a self-healing mechanism that ensures all nodes are identifiable.
 */
export const NodeIdExtension = Extension.create({
  name: 'nodeId',

  /**
   * Adds `nodeId` as a global attribute to all `listItem` nodes.
   */
  addGlobalAttributes() {
    return [
      {
        types: ['listItem'],
        attributes: {
          nodeId: {
            default: null,
            // Defines how the attribute is read from and written to the HTML.
            parseHTML: (element) => element.getAttribute('data-node-id'),
            renderHTML: (attributes) => {
              if (!attributes.nodeId) {
                return {};
              }
              // Persist the ID to the DOM as a `data-node-id` attribute.
              return { 'data-node-id': attributes.nodeId };
            },
          },
        },
      },
    ];
  },

  /**
   * The `onCreate` hook runs once when the editor is initialized.
   * It scans the initial document and assigns a UUID to any `listItem` that does not already have one.
   * This is essential for back-filling IDs when loading existing content.
   */
  onCreate() {
    const { tr } = this.editor.state;
    let modified = false;

    // Iterate over the initial document.
    this.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'listItem' && !node.attrs.nodeId) {
        // If a listItem is found without an ID, assign one.
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          nodeId: uuidv4(),
        });
        modified = true;
      }
    });

    // If any modifications were made, dispatch the transaction.
    if (modified) {
      this.editor.view.dispatch(tr);
    }
  },

  /**
   * Adds a ProseMirror plugin to ensure that any `listItem` created during an editor session
   * gets a `nodeId`.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('nodeIdPlugin'),
        /**
         * `appendTransaction` is called for every transaction before it is applied.
         * This allows us to inspect the transaction and append our own changes.
         */
        appendTransaction: (transactions, oldState, newState) => {
          // Only proceed if the document has actually changed.
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const tr = newState.tr;
          let modified = false;

          // Iterate over all nodes in the new document state.
          newState.doc.descendants((node, pos) => {
            // We are only interested in `listItem` nodes.
            if (node.type.name === 'listItem') {
              // If a node is missing its `nodeId` attribute...
              if (!node.attrs.nodeId) {
                // ...we generate a new UUID and add it to the transaction.
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  nodeId: uuidv4(),
                });
                modified = true;
              }
            }
          });

          // Return the modified transaction if changes were made, otherwise null.
          return modified ? tr : null;
        },
      }),
    ];
  },
});
