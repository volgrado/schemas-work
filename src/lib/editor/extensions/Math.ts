/**
 * @file Math.ts
 * @description Final robust Svelte 5 + Tiptap math extension.
 * Handles inline and block formulas with proper lifecycle management.
 */

import { Node, mergeAttributes, wrappingInputRule } from '@tiptap/core';
import type { NodeViewRendererProps, NodeViewProps } from '@tiptap/core';
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
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('span');
      let component: MathPreviewNodeView;

      component = mount(MathPreviewNodeView, {
        target: dom,
        props: props as unknown as NodeViewProps,
      });

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== props.node.type.name) {
            return false;
          }
          // DEFINITIVE FIX: Add a guard to ensure the `$set` method exists
          // before calling it, as shown to be necessary by your linter.
          if (component && typeof component.$set === 'function') {
            component.$set({ node: updatedNode });
          }
          return true;
        },
        destroy() {
          try {
            // No guard needed for unmount as the function itself is not optional.
            unmount(component);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('MathInline unmount failed during HMR.', error);
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
    return { formula: { default: '' } };
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
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('div');
      let component: MathPreviewNodeView;

      component = mount(MathPreviewNodeView, {
        target: dom,
        props: props as unknown as NodeViewProps,
      });

      return {
        dom,
        stopEvent: () => true,
        update(updatedNode) {
          if (updatedNode.type.name !== props.node.type.name) {
            return false;
          }
          // DEFINITIVE FIX: Apply the same guard here for consistency and safety.
          if (component && typeof component.$set === 'function') {
            component.$set({ node: updatedNode });
          }
          return true;
        },
        destroy() {
          try {
            unmount(component);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('MathBlock unmount failed during HMR.', error);
            }
          }
        },
      };
    };
  },

  addInputRules() {
    return [wrappingInputRule({ find: /^\$\$\s$/, type: this.type })];
  },
});
