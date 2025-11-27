import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const ColorModeExtension = Extension.create({
  name: 'colorMode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('colorMode'),
        state: {
          init() {
            return { mode: 'none', decorations: DecorationSet.empty };
          },
          apply(tr, prevState) {
            const meta = tr.getMeta('COLOR_MODE_UPDATE');
            const mode = meta !== undefined ? meta : prevState.mode;

            if (mode !== 'by-path') {
              return { mode, decorations: DecorationSet.empty };
            }

            if (!tr.docChanged && meta === undefined) {
              return prevState;
            }

            const decorations: Decoration[] = [];
            const doc = tr.doc;
            let currentBranchId: string | null = null;

            doc.descendants((node, pos) => {
              if (node.type.name === 'heading') {
                const level = node.attrs.level;
                const nodeId = node.attrs.nodeId;

                if (level === 1) {
                  // H1 is the root, it starts a new context but has no "branch color" itself.
                  // We reset the branch ID so H1 and any immediate non-H2 children (if any valid) don't get colored.
                  currentBranchId = null;
                } else if (level === 2) {
                  // H2 starts a new branch.
                  currentBranchId = nodeId;
                }

                if (currentBranchId) {
                  let hash = 0;
                  for (let i = 0; i < currentBranchId.length; i++) {
                    hash = (hash << 5) - hash + currentBranchId.charCodeAt(i);
                    hash = hash & hash;
                  }
                  const index = Math.abs(hash) % 6; // 6 gradients available

                  const deco = Decoration.node(pos, pos + node.nodeSize, {
                    class: `branch-color-${index}`,
                  });
                  decorations.push(deco);
                }
              }
            });

            return {
              mode,
              decorations: DecorationSet.create(doc, decorations),
            };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations || DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
