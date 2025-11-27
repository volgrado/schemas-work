/**
 * @file A robust Tiptap extension that ensures every semantic heading (h2, h3, etc.) has
 * a unique, persistent `nodeId` attribute.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { CommandProps } from '@tiptap/core';
import { v4 as uuidv4 } from 'uuid';

// --- TYPE AUGMENTATION FOR TIPTAP ---
// This tells TypeScript that our new command `ensureNodeIds`
// is a valid command that can be chained.
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ensureNodeIds: {
      /**
       * Scans the document and adds a unique nodeId to any heading that is missing one.
       */
      ensureNodeIds: () => ReturnType;
    };
  }
}

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

          newState.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.type.name === 'heading') {
              // if (node.attrs.level === 1) return; // Allow IDs on H1 too

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

  // --- FINAL, CORRECTED AND FULLY TYPED COMMAND ---
  addCommands() {
    return {
      ensureNodeIds:
        () =>
        ({ tr, dispatch }: CommandProps) => {
          let modified = false;
          tr.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.type.name === 'heading' && !node.attrs.nodeId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                nodeId: uuidv4(),
              });
              modified = true;
            }
          });

          if (modified && dispatch) {
            return dispatch(tr);
          }

          return modified;
        },
    };
  },
});
