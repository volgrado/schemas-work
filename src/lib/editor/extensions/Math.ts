/**
 * @file Implements the custom Tiptap nodes for rendering mathematical formulas using KaTeX.
 * This file provides two nodes: `MathInline` for inline formulas and `MathBlock` for block-level formulas.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';
import { modalStore } from '$lib/stores/modalStore';

/**
 * @description The `MathInline` node represents an inline mathematical formula.
 * It is rendered as an inline element and can be placed within a line of text.
 * It uses KaTeX for rendering the formula specified in its `formula` attribute.
 */
export const MathInline = Node.create({
  name: 'math_inline',
  group: 'inline',
  inline: true,
  atom: true, // The node is treated as a single, indivisible unit.

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
    // Renders an empty span, which will be populated by the custom node view.
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline' }),
      0,
    ];
  },

  /**
   * @description The `addNodeView` method provides a custom view for the node.
   * This allows for direct DOM manipulation and interaction.
   */
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('span');
      dom.classList.add('math-inline');

      const formula = node.attrs.formula;
      try {
        // Render the LaTeX formula using KaTeX.
        katex.render(formula, dom, {
          throwOnError: false,
          displayMode: false, // `false` for inline rendering.
        });
      } catch (error) {
        // If rendering fails, display the raw formula and apply an error class.
        dom.innerText = formula;
        dom.classList.add('katex-error');
      }

      // Add a click listener to open the formula editor modal.
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

/**
 * @description The `MathBlock` node represents a block-level mathematical formula.
 * It is rendered as a distinct block, separate from the main text flow.
 * It uses KaTeX with `displayMode: true` for block-style rendering.
 */
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

  /**
   * @description The custom node view for the block-level math node.
   * It is responsible for rendering the KaTeX formula and handling click events.
   */
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.classList.add('math-block');

      const formula = node.attrs.formula;

      try {
        // Render the LaTeX formula using KaTeX.
        katex.render(formula, dom, {
          throwOnError: false,
          displayMode: true, // `true` for block rendering.
        });
      } catch (error) {
        dom.innerText = formula;
        dom.classList.add('katex-error');
      }

      // Add a click listener to open the formula editor modal.
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
