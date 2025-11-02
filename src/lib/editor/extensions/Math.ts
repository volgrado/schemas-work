/**
 * @file Math.ts
 * @description Final robust Svelte 5 + Tiptap math extension.
 * Handles inline and block formulas with proper lifecycle management.
 */

import { Node, mergeAttributes, wrappingInputRule } from '@tiptap/core';
// --- THE FIX: Import the correct type for the renderer function ---
import type { NodeViewRendererProps } from '@tiptap/core';
import { mount, unmount } from 'svelte';
import MathPreviewNodeView from '$lib/components/editor/MathPreviewNodeView.svelte';

// =================================================================
// --- INLINE MATH NODE ---
// =================================================================

export const MathInline = Node.create({
  name: 'math_inline',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return { formula: { default: '' } };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline' }),
    ];
  },

  addNodeView() {
    const nodeType = this.type;

    // --- THE FIX: The function returned here is a NodeViewRenderer,
    // which receives NodeViewRendererProps from Tiptap.
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('span');
      let component: MathPreviewNodeView;

      component = mount(MathPreviewNodeView, {
        target: dom,
        props: props, // Pass the whole object
      });

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== nodeType.name) {
            return false;
          }
          component.updateProps({ node: updatedNode });
          return true;
        },
        destroy() {
          try {
            if (component) unmount(component);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn(
                'MathInline component unmount failed during HMR.',
                error
              );
            }
          }
        },
      };
    };
  },
});

// =================================================================
// --- BLOCK MATH NODE ---
// =================================================================

export const MathBlock = Node.create({
  name: 'math_block',
  group: 'block',
  atom: true,
  code: true,

  addAttributes() {
    return {
      formula: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }),
    ];
  },

  addNodeView() {
    const nodeType = this.type;

    // --- APPLY THE SAME FIX HERE ---
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('div');
      let component: MathPreviewNodeView;

      component = mount(MathPreviewNodeView, {
        target: dom,
        props: props,
      });

      return {
        dom,
        stopEvent: () => true,
        update(updatedNode) {
          if (updatedNode.type.name !== nodeType.name) {
            return false;
          }
          component.updateProps({ node: updatedNode });
          return true;
        },
        destroy() {
          try {
            if (component) unmount(component);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn(
                'MathBlock component unmount failed during HMR.',
                error
              );
            }
          }
        },
      };
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\$\$\s$/,
        type: this.type,
      }),
    ];
  },
});
