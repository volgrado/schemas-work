/**
 * @file Implements a robust NodeIdExtension for the Tiptap editor.
 * This extension ensures every semantic heading (h2, h3, etc.) has a unique `nodeId`,
 * which is critical for linking features like cards, TTS, and the neural index.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { v4 as uuidv4 } from 'uuid';

export const NodeIdExtension = Extension.create({
  name: 'nodeId',

  addGlobalAttributes() {
    return [
      {
        // --- MIGRATION CHANGE: The nodeId is now the cornerstone of headings. ---
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

        // This is the core logic. It runs after every transaction.
        appendTransaction: (transactions, oldState, newState) => {
          // If the document didn't change, we don't need to do anything.
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const tr = newState.tr;
          let modified = false;
          const seenNodeIds = new Set<string>(); // Tracks IDs seen in this scan.

          // Scan the entire document from top to bottom.
          newState.doc.descendants((node, pos) => {
            // --- MIGRATION CHANGE: Target 'heading' nodes. ---
            if (node.type.name === 'heading') {
              // --- AUDIT FIX: Exclude the main H1 document title. ---
              // The document title is not a semantic "node" for features like cards.
              if (node.attrs.level === 1) {
                return; // Skip and continue scanning.
              }

              const nodeId = node.attrs.nodeId;

              // A heading needs a new ID if:
              // 1. It doesn't have an ID (`!nodeId`).
              // 2. Its ID is a duplicate (`seenNodeIds.has(nodeId)`).
              if (!nodeId || seenNodeIds.has(nodeId)) {
                const newNodeId = uuidv4();
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  nodeId: newNodeId,
                });
                modified = true;
                seenNodeIds.add(newNodeId); // Add the new, unique ID to our set.
              } else {
                // The ID is valid and unique, so add it to the set for future checks.
                seenNodeIds.add(nodeId);
              }
            }
          });

          // If we made any changes, return the modified transaction.
          return modified ? tr : null;
        },
      }),
    ];
  },
});
