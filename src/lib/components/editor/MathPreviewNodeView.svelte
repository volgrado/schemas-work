<!-- src/lib/components/editor/MathPreviewNodeView.svelte -->
<script lang="ts">
  import type { Editor } from '@tiptap/core';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';
  // Lazy load KaTeX - import type only
  import type katex from 'katex';
  import { openModal } from '$lib/stores/modalStore.svelte';
  import type { Modal } from '$lib/types';
  import { t } from '$lib/utils/i18n';

  // --- Props from Tiptap Node View ---
  let { editor, node, getPos, selected } = $props<{
    editor: Editor;
    node: ProseMirrorNode;
    getPos: () => number | undefined;
    selected: boolean;
  }>();

  let previewEl: HTMLElement | null = $state(null);
  let katexModule: typeof katex | null = $state(null);

  // Load KaTeX on first use
  $effect(() => {
    if (!katexModule) {
      import('katex').then((module) => {
        katexModule = module.default;
      });
    }
  });

  // This effect reactively renders the KaTeX formula whenever the node's attributes change.
  $effect(() => {
    if (!previewEl || !katexModule) return;
    try {
      katexModule.render(node.attrs.formula || '', previewEl, {
        throwOnError: false,
        displayMode: node.type.name === 'math_block',
        colorIsTextColor: true,
      });
    } catch (err) {
      console.error('KaTeX rendering error:', err);
      previewEl.textContent = 'Invalid LaTeX';
    }
  });

  /**
   * CORRECTED: Creates the function that will save the data back to the Tiptap editor.
   * This function has access to the `editor` instance and knows how to update the node.
   */
  function handleSaveFormula(newFormula: string): void {
    const pos = getPos();
    if (typeof pos !== 'number') return;

    // Use the Tiptap editor's command chain to update the node's 'formula' attribute.
    editor
      .chain()
      .focus()
      .setNodeSelection(pos)
      .updateAttributes(node.type.name, { formula: newFormula })
      .run();
  }

  /**
   * Opens the formula editor modal, passing both the initial data and the save callback.
   */
  function openEditModal(): void {
    const pos = getPos();
    if (typeof pos !== 'number') return;

    const config: Modal.FormulaConfig = {
      type: 'formula',
      nodePos: pos,
      nodeType: node.type.name as 'math_block' | 'math_inline',
      initialFormula: node.attrs.formula,
      // CORRECTED: Pass the save function in the modal configuration.
      // This is the key to connecting the modal's "Save" button back to this component.
      onsave: handleSaveFormula,
    };
    openModal(config);
  }

  // --- Event Handlers ---

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
  <div bind:this={previewEl}></div>
</span>

<style>
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
