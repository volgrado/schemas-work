// src/lib/editor/extensions/SmartEnter.ts
import { Extension, findParentNode } from '@tiptap/core';
import { Plugin, TextSelection } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

export const SmartEnter = Extension.create({
  name: 'smartEnter',

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, commands } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        const listItem = findParentNode((n) => n.type.name === 'listItem')(
          selection
        );
        if (!listItem) return false;

        const parentParagraph = findParentNode(
          (n) => n.type.name === 'paragraph'
        )(selection);
        if (!parentParagraph) return false;

        const isFirstChild = listItem.node.firstChild === parentParagraph.node;

        if (isFirstChild) {
          if (parentParagraph.node.content.size === 0) {
            return commands.splitListItem('listItem');
          }

          const nextNodePos =
            parentParagraph.pos + parentParagraph.node.nodeSize;
          const nextNode = state.doc.nodeAt(nextNodePos);

          if (nextNode) {
            // *** CORRECCIÓN CLAVE AQUÍ ***
            // Usamos el comando `setTextSelection` de Tiptap para mover el cursor.
            return commands.setTextSelection(nextNodePos + 1);
          }

          return commands.insertContentAt(
            nextNodePos,
            { type: 'paragraph', attrs: { role: 'description' } },
            { updateSelection: true }
          );
        }

        if (parentParagraph.node.content.size === 0) {
          return commands.splitListItem('listItem');
        }

        return false;
      },

      Backspace: () => {
        const { selection, doc } = this.editor.state;
        if (!selection.empty) return false;

        const listItem = findParentNode((n) => n.type.name === 'listItem')(
          selection
        );

        // Si estamos en un item completamente vacío (solo un término vacío),
        // al presionar Backspace se elimina la lista.
        if (listItem && doc.nodeAt(listItem.pos)?.textContent.length === 0) {
          return this.editor.chain().toggleBulletList().run();
        }

        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
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
              node.forEach((child: ProseMirrorNode, offset: number) => {
                if (child.type.name === 'paragraph') {
                  const targetRole = isFirstParagraph ? 'term' : 'description';
                  if (child.attrs.role !== targetRole) {
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
