// src/lib/editor/extensions/PositionSyncExtension.ts
/**
 * @file Implements the `PositionSyncExtension` for the Tiptap editor.
 * This extension ensures that every `listItem` node has an attribute (`pos`)
 * that is always synchronized with its current document position.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * The unique key for the ProseMirror plugin.
 * @constant
 */
export const POSITION_SYNC_PLUGIN_KEY = new PluginKey('positionSync');

/**
 * @description The `PositionSyncExtension` is a utility extension that guarantees every `listItem`
 * node has a `pos` attribute reflecting its absolute position within the ProseMirror document.
 * This is useful for features that need a static reference to a node's position, even as the
 * document content changes.
 *
 * It works by using a ProseMirror plugin that, after every document change, iterates through
 * all `listItem` nodes and updates their `pos` attribute if it has become outdated.
 */
export const PositionSyncExtension = Extension.create({
  name: 'positionSync',

  /**
   * Adds `pos` as a global attribute to all `listItem` nodes.
   * This attribute is for internal use and is not rendered to the HTML.
   */
  addGlobalAttributes() {
    return [
      {
        types: ['listItem'],
        attributes: {
          pos: {
            default: null,
            // This attribute should not be rendered to or parsed from the DOM.
            renderHTML: () => null,
            parseHTML: () => null,
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: POSITION_SYNC_PLUGIN_KEY,
        /**
         * `appendTransaction` is called for every transaction, allowing us to ensure
         * the `pos` attribute is always up-to-date.
         */
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) {
            return null; // No changes to the document, so no positions need updating.
          }

          const tr = newState.tr;
          let modified = false;

          // Iterate over all nodes in the new document state.
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'listItem') {
              // If the stored position does not match the actual position...
              if (node.attrs.pos !== pos) {
                // ...update the node's `pos` attribute.
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, pos });
                modified = true;
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
