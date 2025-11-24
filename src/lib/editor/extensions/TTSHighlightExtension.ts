import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export interface TTSHighlightOptions {
  highlightClass: string;
}

export interface TTSHighlightStorage {
  decoration: Decoration | null;
}

export const TTSHighlightExtension = Extension.create<TTSHighlightOptions, TTSHighlightStorage>({
  name: 'ttsHighlight',

  addOptions() {
    return {
      highlightClass: 'is-current-tts-word',
    };
  },

  addStorage() {
    return {
      decoration: null,
    };
  },

  addCommands() {
    return {
      setTTSHighlight:
        (originalNodePos: number, relFrom: number, relTo: number) =>
        ({ tr, state, dispatch }) => {
          if (dispatch) {
            // Find the node in the local document that matches the original position
            let localPos: number | null = null;
            
            state.doc.descendants((node, pos) => {
              if (localPos !== null) return false;
              
              // dataPos is stored as a string attribute
              if (node.attrs.dataPos && parseInt(node.attrs.dataPos) === originalNodePos) {
                localPos = pos;
                return false;
              }
            });

            if (localPos !== null) {
              const from = localPos + 1 + relFrom;
              const to = localPos + 1 + relTo;
              
              // Create a decoration
              // We use a transaction metadata or plugin state to store this? 
              // Actually, the easiest way is to update the plugin state via a meta transaction.
              tr.setMeta('ttsHighlight', { from, to });
            } else {
              // Clear highlight if not found
              tr.setMeta('ttsHighlight', null);
            }
          }
          return true;
        },
      clearTTSHighlight:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta('ttsHighlight', null);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { highlightClass } = this.options;

    return [
      new Plugin({
        key: new PluginKey('ttsHighlight'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet) {
            // Check for our meta property
            const meta = tr.getMeta('ttsHighlight');
            
            if (meta === null) {
              return DecorationSet.empty;
            }
            
            if (meta && typeof meta === 'object') {
              const { from, to } = meta;
              const deco = Decoration.inline(from, to, { class: highlightClass });
              return DecorationSet.create(tr.doc, [deco]);
            }

            // Map existing decorations if document changed
            return oldSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ttsHighlight: {
      setTTSHighlight: (originalNodePos: number, relFrom: number, relTo: number) => ReturnType;
      clearTTSHighlight: () => ReturnType;
    };
  }
}
