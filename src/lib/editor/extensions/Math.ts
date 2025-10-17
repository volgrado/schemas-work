import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';
import { modalStore } from '$lib/stores/modalStore';

// --- Inline Math Node ---
export const MathInline = Node.create({
  name: 'math_inline',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      formula: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline' }),
      0,
    ];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('span');
      dom.classList.add('math-inline');

      const formula = node.attrs.formula;
      try {
        katex.render(formula, dom, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (error) {
        dom.innerText = formula;
        dom.classList.add('katex-error');
      }

      dom.addEventListener('click', () => {
        if (!editor.isEditable) return;
        const pos = getPos();
        if (pos === undefined) return;
        modalStore.open({
          type: 'formula',
          nodePos: pos,
          attrs: { formula: node.attrs.formula },
        });
      });

      return { dom };
    };
  },
});

// --- Block Math Node ---
export const MathBlock = Node.create({
  name: 'math_block',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      formula: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }),
      0,
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.classList.add('math-block');

      const formula = node.attrs.formula;

      try {
        katex.render(formula, dom, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (error) {
        dom.innerText = formula;
        dom.classList.add('katex-error');
      }

      dom.addEventListener('click', () => {
        if (!editor.isEditable) return;
        const pos = getPos();
        if (pos === undefined) return;
        modalStore.open({
          type: 'formula',
          nodePos: pos,
          attrs: { formula: node.attrs.formula },
        });
      });
      return { dom };
    };
  },
});
