<!-- src/lib/components/editor/MathPreviewNodeView.svelte -->
<script lang="ts">
  // --- THE FIX: Use the correct, more general type for creation ---
  import type { NodeViewRendererProps } from '@tiptap/core';
  import type { Node } from 'prosemirror-model';
  import katex from 'katex';
  import { modalStore, type FormulaModalConfig } from '$lib/stores/modalStore';

  let { editor, node: initialNode, getPos }: NodeViewRendererProps = $props(); // <-- Use NodeViewRendererProps here

  let node = $state(initialNode);

  let previewEl: HTMLElement | null = null;

  export function updateProps(newProps: { node: Node }): void {
    node = newProps.node;
  }

  $effect(() => {
    if (!previewEl || !node) return;
    try {
      const source =
        node.attrs.formula ||
        (node.type.name === 'math_block'
          ? '\\text{Click to edit block formula}'
          : '\\text{Click to edit}');
      katex.render(source, previewEl, {
        throwOnError: false,
        displayMode: node.type.name === 'math_block',
        colorIsTextColor: true,
      });
    } catch (err) {
      console.error('KaTeX rendering error:', err);
      if (previewEl) {
        previewEl.textContent = 'Invalid LaTeX';
      }
    }
  });

  function openEditModal(): void {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const config: FormulaModalConfig = {
      type: 'formula',
      nodePos: pos,
      nodeType: node.type.name as 'math_block' | 'math_inline',
      initialFormula: node.attrs.formula,
    };
    modalStore.open(config);
  }
</script>

<!-- TEMPLATE and STYLES remain exactly the same -->
<span
  class="math-preview-node-view-wrapper"
  class:is-block={node.type.name === 'math_block'}
  class:is-inline={node.type.name === 'math_inline'}
  on:click|preventDefault={openEditModal}
  role="button"
  tabindex="0"
  title="Click to edit formula"
  on:keydown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openEditModal();
    }
  }}
>
  <div bind:this={previewEl} />
</span>

<style>
  /* All styles remain the same */
  .math-preview-node-view-wrapper {
    cursor: pointer;
    transition: background-color 0.2s ease;
    border-radius: var(--space-xs);
  }
  .is-block {
    display: block;
    background-color: var(--color-gray-50);
    border: 1px dashed var(--color-gray-200);
    border-radius: var(--space-sm);
    padding: var(--space-md);
    margin: var(--space-md) 0;
  }
  .is-block > div {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  .is-block:hover {
    background-color: var(--color-gray-100);
    border-color: var(--color-gray-300);
  }
  .is-inline {
    display: inline-block;
    padding: 0 var(--space-xxs);
    background-color: hsl(var(--color-accent-hsl) / 0.1);
    border-bottom: 1px solid hsl(var(--color-accent-hsl) / 0.3);
  }
  .is-inline:hover {
    background-color: hsl(var(--color-accent-hsl) / 0.2);
  }
  :global(.dark-theme) .is-block {
    background-color: var(--color-gray-900);
    border-color: var(--color-gray-700);
  }
  :global(.dark-theme) .is-block:hover {
    background-color: var(--color-gray-800);
    border-color: var(--color-gray-600);
  }
</style>
