// src/lib/editor/extensions/PositionSyncExtension.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { Transaction } from 'prosemirror-state';

export const PositionSyncExtension = Extension.create({
  name: 'positionSync',

  addGlobalAttributes() {
    return [
      {
        types: ['listItem'],
        attributes: {
          pos: {
            default: null,
            renderHTML: () => null,
            parseHTML: () => null,
          },
        },
      },
    ];
  },

  // *** CORRECCIÓN: 'addProseMirrorPlugins' en lugar de 'addProseMirrorPlugin' ***
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('positionSyncPlugin'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'listItem') {
              if (node.attrs.pos !== pos) {
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
