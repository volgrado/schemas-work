<script lang="ts">
  import type { Editor } from '@tiptap/core';
  // FIX: Import ProseMirrorNode to use in the inline props type.
  import type { Node as ProseMirrorNode } from 'prosemirror-model';
  import katex from 'katex';
  import { openModal } from '$lib/stores/modalStore.svelte';
  import type { Modal } from '$lib/types';
  import { t } from '$lib/utils/i18n';

  // --- Props from Tiptap Node View ---
  // FIX: Use an inline type for `$props` to ensure tooling compatibility.
  // This resolves the "Expected 0 type arguments" error.
  let { editor, node, getPos, selected } = $props<{
    editor: Editor;
    node: ProseMirrorNode;
    getPos: () => number | undefined;
    selected: boolean;
  }>();

  let previewEl: HTMLElement | null = $state(null);

  $effect(() => {
    if (!previewEl) return;
    try {
      katex.render(node.attrs.formula || '', previewEl, {
        throwOnError: false,
        displayMode: node.type.name === 'math_block',
        colorIsTextColor: true,
      });
    } catch (err) {
      console.error('KaTeX rendering error:', err);
      previewEl.textContent = 'Invalid LaTeX';
    }
  });

  function openEditModal(): void {
    const pos = getPos();
    if (typeof pos !== 'number') return;

    const config: Modal.FormulaConfig = {
      type: 'formula',
      nodePos: pos,
      nodeType: node.type.name as 'math_block' | 'math_inline',
      initialFormula: node.attrs.formula,
    };
    openModal(config);
  }

  function handleWrapperClick(event: MouseEvent): void {
    event.preventDefault();
    openEditModal();
  }

  function handleWrapperKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openEditModal();
    }
  }
</script>

<span
  class="math-preview-node-view-wrapper"
  class:is-block={node.type.name === 'math_block'}
  class:is-inline={node.type.name === 'math_inline'}
  class:is-selected={selected}
  class:is-empty={!node.attrs.formula}
  onclick={handleWrapperClick}
  role="button"
  tabindex="0"
  aria-label={$t('math_editor.edit_aria_label')}
  onkeydown={handleWrapperKeydown}
>
  <div bind:this={previewEl} />
</span>

<style>
  /* Styles are unchanged and correct */
  .math-preview-node-view-wrapper {
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
    border-radius: var(--border-radius-sm);
    position: relative;
  }
  .is-block {
    display: block;
    background-color: var(--color-gray-50);
    border: 1px dashed var(--color-gray-200);
    padding: var(--space-md);
    margin: var(--space-md) 0;
  }
  .is-block > div {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-height: 1.5em;
  }
  .is-block:hover {
    background-color: var(--color-gray-100);
    border-color: var(--color-gray-400);
  }
  .is-inline {
    display: inline-block;
    padding: 0 var(--space-xs);
    background-color: hsl(var(--color-accent-hsl) / 0.1);
    border-bottom: 2px solid hsl(var(--color-accent-hsl) / 0.2);
  }
  .is-inline:hover {
    background-color: hsl(var(--color-accent-hsl) / 0.2);
  }
  .is-selected {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  .is-block.is-empty::before,
  .is-inline.is-empty::before {
    color: var(--color-text-tertiary);
    font-style: italic;
    font-size: 0.9em;
    user-select: none;
  }
  .is-block.is-empty::before {
    content: 'Click to edit block formula';
  }
  .is-inline.is-empty::before {
    content: 'Click to edit';
  }
  :global(.dark-theme) .is-block {
    background-color: var(--color-gray-900);
    border-color: var(--color-gray-700);
  }
  :global(.dark-theme) .is-block:hover {
    background-color: var(--color-gray-800);
    border-color: var(--color-gray-600);
  }
  :global(.dark-theme) .is-block.is-empty::before,
  :global(.dark-theme) .is-inline.is-empty::before {
    color: var(--color-text-dark-tertiary);
  }
</style>
