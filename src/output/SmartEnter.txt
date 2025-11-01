// src/lib/editor/extensions/SmartEnter.ts
/**
 * @file Implements the `SmartEnter` extension for the Tiptap editor. This extension
 * provides a more intuitive editing experience within list items, particularly for
 * creating term/definition pairs, and ensures the correct semantic roles are applied.
 */

import { Extension, findParentNode } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * @description The `SmartEnter` extension enhances the behavior of the `Enter` and `Backspace`
 * keys within `listItem` nodes to facilitate a fluid workflow for creating flashcard-like
 * content (terms and definitions).
 *
 * It also includes a ProseMirror plugin that automatically enforces the correct `role`
 * (`term` or `description`) on paragraphs within a `listItem`, ensuring data integrity.
 */
export const SmartEnter = Extension.create({
  name: 'smartEnter',

  /**
   * Overrides the default behavior of the `Enter` and `Backspace` keys within list items.
   */
  addKeyboardShortcuts() {
    return {
      /**
       * Custom `Enter` key logic.
       * - When in the first paragraph (the 'term'), it moves the cursor to the second
       *   paragraph (the 'description'), creating it if it doesn't exist.
       * - When in an empty paragraph, it splits the list item.
       */
      Enter: () => {
        const { state, commands } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        const listItem = findParentNode((n) => n.type.name === 'listItem')(
          selection
        );
        if (!listItem) return false; // Not in a list item, do nothing.

        const parentParagraph = findParentNode(
          (n) => n.type.name === 'paragraph'
        )(selection);
        if (!parentParagraph) return false;

        const isFirstChild = listItem.node.firstChild === parentParagraph.node;

        // Logic for when the cursor is in the first paragraph (the 'term').
        if (isFirstChild) {
          if (parentParagraph.node.content.size === 0) {
            // If the term is empty, split to a new list item.
            return commands.splitListItem('listItem');
          }

          const nextNodePos =
            parentParagraph.pos + parentParagraph.node.nodeSize;
          const nextNode = state.doc.nodeAt(nextNodePos);

          // If a description paragraph already exists, move the cursor to it.
          if (nextNode) {
            return commands.setTextSelection(nextNodePos + 1);
          }

          // Otherwise, create a new description paragraph and move the cursor.
          return commands.insertContentAt(
            nextNodePos,
            { type: 'paragraph', attrs: { role: 'description' } },
            { updateSelection: true }
          );
        }

        // Logic for when the cursor is in a description paragraph.
        if (parentParagraph.node.content.size === 0) {
          // If the description is empty, split to a new list item.
          return commands.splitListItem('listItem');
        }

        // Otherwise, allow default Enter behavior (split the paragraph).
        return false;
      },

      /**
       * Custom `Backspace` key logic.
       * If a list item is completely empty, pressing backspace will outdent or
       * remove the list, rather than just deleting the empty paragraph.
       */
      Backspace: () => {
        const { selection, doc } = this.editor.state;
        if (!selection.empty) return false;

        const listItem = findParentNode((n) => n.type.name === 'listItem')(
          selection
        );

        if (listItem && doc.nodeAt(listItem.pos)?.textContent.length === 0) {
          return this.editor.chain().toggleBulletList().run();
        }

        return false;
      },
    };
  },

  /**
   * Adds a ProseMirror plugin that enforces the correct `role` on paragraphs within a `listItem`.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('roleEnforcer'),
        /**
         * After every transaction, this function scans the document and corrects the roles
         * of paragraphs inside list items.
         */
        appendTransaction: (
          transactions: readonly Transaction[],
          oldState: EditorState,
          newState: EditorState
        ) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.type.name === 'listItem') {
              let isFirstParagraph = true;
              // Iterate through the children of the list item.
              node.forEach((child: ProseMirrorNode, offset: number) => {
                if (child.type.name === 'paragraph') {
                  // The first paragraph must be a 'term', the rest are 'descriptions'.
                  const targetRole = isFirstParagraph ? 'term' : 'description';
                  if (child.attrs.role !== targetRole) {
                    // If the role is incorrect, set it.
                    tr.setNodeMarkup(pos + 1 + offset, undefined, {
                      ...child.attrs,
                      role: targetRole,
                    });
                    modified = true;
                  }
                  isFirstParagraph = false;
                }
              });
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
