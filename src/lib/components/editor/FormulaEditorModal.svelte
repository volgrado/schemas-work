<!-- src/lib/components/editor/FormulaEditorModal.svelte -->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import katex from 'katex';
  import { editorStore } from '$lib/stores/editorStore';
  import Button from '$lib/components/ui/Button.svelte';

  export let initialFormula: string;
  export let nodePos: number;
  export let nodeType: 'math_block' | 'math_inline';
  export let onClose: () => void;

  let latexSource = initialFormula || '';
  let textareaEl: HTMLTextAreaElement | null = null;
  let previewEl: HTMLElement | null = null;

  // ================================================================
  // --- RENDERIZADO EN VIVO ---
  // ================================================================
  function renderPreview(): void {
    if (!previewEl) return;
    try {
      katex.render(latexSource || '\\text{Enter formula...}', previewEl, {
        throwOnError: false,
        displayMode: nodeType === 'math_block',
        colorIsTextColor: true,
      });
    } catch (err) {
      previewEl.textContent = 'Invalid LaTeX syntax';
      console.error('KaTeX render error:', err);
    }
  }

  // Inicializa vista y enfoque
  onMount(async () => {
    await tick();
    textareaEl?.focus();
    textareaEl?.select();
    renderPreview();
  });

  // Reactividad controlada solo sobre la fórmula
  $: if (latexSource !== undefined) {
    renderPreview();
  }

  // ================================================================
  // --- GUARDAR CAMBIOS ---
  // ================================================================
  function saveChanges(): void {
    const editor = get(editorStore).instance;
    if (!editor) {
      console.error('Editor instance not found.');
      return;
    }

    const { tr } = editor.view.state;
    const node = editor.state.doc.nodeAt(nodePos);

    if (!node) return;

    // Force recreation by replacing the node with a new copy
    const newNode = node.type.create(
      { ...node.attrs, formula: latexSource },
      node.content,
      node.marks
    );

    editor.view.dispatch(
      tr.replaceWith(nodePos, nodePos + node.nodeSize, newNode)
    );
    editor.commands.focus();
    onClose();
  }

  // ================================================================
  // --- ATAJOS DE TECLADO ---
  // ================================================================
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      saveChanges();
    }
  }

  // ================================================================
  // --- INSERCIÓN DE SÍMBOLOS ---
  // ================================================================
  async function insertSymbol(
    snippet: string,
    cursorOffset: number
  ): Promise<void> {
    if (!textareaEl) return;
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;

    latexSource =
      latexSource.slice(0, start) + snippet + latexSource.slice(end);

    const newCursorPos = start + cursorOffset;
    await tick();
    textareaEl.focus();
    textareaEl.setSelectionRange(newCursorPos, newCursorPos);
  }
</script>

<!-- ================================================================
     ESTRUCTURA VISUAL
================================================================ -->
<div class="formula-editor-modal-wrapper" on:keydown={handleKeydown}>
  <div class="editor-pane">
    <div class="symbol-toolbar">
      <Button
        title="Fraction (\\frac)"
        variant="ghost"
        size="sm"
        iconOnly
        on:click={() => insertSymbol('\\frac{}{}', 6)}>x/y</Button
      >
      <Button
        title="Superscript"
        variant="ghost"
        size="sm"
        iconOnly
        on:click={() => insertSymbol('^{}', 1)}>x²</Button
      >
      <Button
        title="Subscript"
        variant="ghost"
        size="sm"
        iconOnly
        on:click={() => insertSymbol('_{}', 1)}>x₂</Button
      >
      <Button
        title="Square Root (\\sqrt)"
        variant="ghost"
        size="sm"
        iconOnly
        on:click={() => insertSymbol('\\sqrt{}', 6)}>√</Button
      >
      <Button
        title="Summation (\\sum)"
        variant="ghost"
        size="sm"
        iconOnly
        on:click={() => insertSymbol('\\sum_{}^{}', 5)}>∑</Button
      >
      <Button
        title="Greek Letter Alpha (\\alpha)"
        variant="ghost"
        size="sm"
        iconOnly
        on:click={() => insertSymbol('\\alpha ', 7)}>α</Button
      >
    </div>

    <textarea
      bind:this={textareaEl}
      bind:value={latexSource}
      class="latex-editor-textarea"
      placeholder="E = mc^2"
      rows="4"
    />
  </div>

  <div class="preview-pane">
    <div class="preview-header">Live Preview</div>
    <div class="katex-preview-container">
      <div bind:this={previewEl}></div>
    </div>
  </div>

  <div class="modal-actions">
    <Button variant="secondary" on:click={onClose}>Cancel</Button>
    <Button variant="primary" on:click={saveChanges}>Save Formula</Button>
  </div>
</div>

<!-- ================================================================
     ESTILOS
================================================================ -->
<style>
  .formula-editor-modal-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .editor-pane {
    border: 1px solid var(--color-border);
    border-radius: var(--space-sm);
    overflow: hidden;
  }

  .symbol-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-gray-50);
  }

  .latex-editor-textarea {
    width: 100%;
    border: none;
    background-color: transparent;
    font-family: var(--font-mono);
    font-size: 1rem;
    resize: vertical;
    outline: none;
    color: var(--color-text);
    padding: var(--space-sm);
  }

  .preview-pane {
    border: 1px solid var(--color-border);
    border-radius: var(--space-sm);
    background-color: var(--color-gray-50);
  }

  .preview-header {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-gray-500);
    padding: var(--space-xs) var(--space-md);
    border-bottom: 1px solid var(--color-border);
  }

  .katex-preview-container {
    padding: var(--space-md);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60px;
    overflow-x: auto;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }

  :global(.dark-theme) .preview-pane {
    background-color: var(--color-gray-900);
  }

  :global(.dark-theme) .symbol-toolbar {
    background-color: var(--color-gray-800);
    border-color: var(--color-gray-700);
  }
</style>
