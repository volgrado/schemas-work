/**
 * @file A robust Tiptap extension that ensures every semantic heading (h2, h3, etc.) has
 * a unique, persistent `nodeId` attribute.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { v4 as uuidv4 } from 'uuid';

export const NodeIdExtension = Extension.create({
  name: 'nodeId',

  addGlobalAttributes() {
    return [
      {
        types: ['heading'],
        attributes: {
          nodeId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-node-id'),
            renderHTML: (attributes) => {
              if (attributes.nodeId) {
                return { 'data-node-id': attributes.nodeId };
              }
              return {};
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('nodeIdValidatorPlugin'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const tr = newState.tr;
          let modified = false;
          const seenNodeIds = new Set<string>();

          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'heading') {
              // Exclude the main H1 document title from this logic.
              if (node.attrs.level === 1) {
                return;
              }

              const nodeId = node.attrs.nodeId;
              if (!nodeId || seenNodeIds.has(nodeId)) {
                const newNodeId = uuidv4();
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  nodeId: newNodeId,
                });
                modified = true;
                seenNodeIds.add(newNodeId);
              } else {
                seenNodeIds.add(nodeId);
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
