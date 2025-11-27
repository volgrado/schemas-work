<!-- src/lib/components/editor/FormulaEditorModal.svelte -->
<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import katex from 'katex';
  import { tick } from 'svelte';

  // --- UI Components ---
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';

  // --- Svelte 5 Props ---
  // This component is designed to receive the `onsave` function as a prop.
  let {
    show = $bindable(false),
    initialFormula,
    nodeType,
    nodePos,
    onsave,
  } = $props<{
    show?: boolean;
    initialFormula: string;
    nodeType: 'math_block' | 'math_inline';
    nodePos: number;
    onsave: (formula: string) => void;
  }>();

  // --- State ---
  let latexSource = $state('');
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let previewEl = $state<HTMLElement | null>(null);

  // Effect to initialize the editor's content when the modal is shown.
  $effect(() => {
    if (show) {
      latexSource = initialFormula || '';
      // Focus and select the text for a better user experience.
      setTimeout(() => {
        textareaEl?.focus();
        textareaEl?.select();
      }, 50);
    }
  });

  // Effect to render the KaTeX preview whenever the source text changes.
  $effect(() => {
    if (previewEl) {
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
  });

  // Derived state to check for unsaved changes.
  const hasUnsavedChanges = $derived(latexSource !== initialFormula);

  // --- Event Handlers ---

  /**
   * Handles the request to close the modal, checking for unsaved changes first.
   */
  function requestClose() {
    if (hasUnsavedChanges) {
      if (confirm(i18n.t('quickCardEditor.unsavedChangesConfirm'))) {
        show = false;
      }
    } else {
      show = false;
    }
  }

  /**
   * Saves the content by calling the `onsave` function passed in from the parent.
   */
  function handleSave() {
    onsave(latexSource);
    show = false;
  }

  /**
   * Handles keyboard shortcuts (Ctrl/Cmd + Enter) for saving.
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSave();
    }
  }

  /**
   * Inserts a LaTeX snippet into the textarea at the current cursor position.
   */
  async function insertSymbol(snippet: string, cursorOffset: number) {
    if (!textareaEl) return;
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;

    latexSource =
      latexSource.slice(0, start) + snippet + latexSource.slice(end);

    // Position the cursor intelligently inside the inserted snippet.
    const newCursorPos = start + cursorOffset;
    await tick(); // Wait for the DOM to update.
    textareaEl.focus();
    textareaEl.setSelectionRange(newCursorPos, newCursorPos);
  }
</script>

<Modal title={i18n.t('math_editor.title')} bind:show onClose={requestClose}>
  <form
    class="formula-editor-modal-wrapper"
    onsubmit={handleSave}
  >
    <div class="editor-pane">
      <div class="symbol-toolbar">
        <Button
          title="Fraction (\\frac)"
          variant="ghost"
          size="sm"
          type="button"
          onclick={() => insertSymbol('\\frac{}{}', 6)}>x/y</Button
        >
        <Button
          title="Superscript"
          variant="ghost"
          size="sm"
          type="button"
          onclick={() => insertSymbol('^{}', 1)}>xÂ²</Button
        >
        <Button
          title="Subscript"
          variant="ghost"
          size="sm"
          type="button"
          onclick={() => insertSymbol('_{}', 1)}>xâ‚‚</Button
        >
        <Button
          title="Square Root (\\sqrt)"
          variant="ghost"
          size="sm"
          type="button"
          onclick={() => insertSymbol('\\sqrt{}', 6)}>âˆš</Button
        >
        <Button
          title="Summation (\\sum)"
          variant="ghost"
          size="sm"
          type="button"
          onclick={() => insertSymbol('\\sum_{}^{}', 5)}>âˆ‘</Button
        >
        <Button
          title="Greek Letter Alpha (\\alpha)"
          variant="ghost"
          size="sm"
          type="button"
          onclick={() => insertSymbol('\\alpha ', 7)}>Î±</Button
        >
      </div>
      <textarea
        bind:this={textareaEl}
        bind:value={latexSource}
        class="latex-editor-textarea"
        placeholder="E = mc^2"
        rows="4"
        aria-label={i18n.t('math_editor.editor_aria_label')}
        onkeydown={handleKeydown}
      ></textarea>
    </div>

    <div class="preview-pane">
      <div class="preview-header">{i18n.t('math_editor.live_preview')}</div>
      <div class="katex-preview-container">
        <div bind:this={previewEl}></div>
      </div>
    </div>

    <div class="modal-actions">
      <Button variant="secondary" type="button" onclick={requestClose}
        >{i18n.t('common.cancel')}</Button
      >
      <Button variant="primary" type="submit">{i18n.t('common.save')}</Button>
    </div>
  </form>
</Modal>

<style>
  .formula-editor-modal-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .editor-pane {
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-sm);
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
    border-radius: var(--border-radius-sm);
    background-color: var(--color-gray-50);
  }
  .preview-header {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
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
    margin-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }
  /* Removed redundant dark theme overrides */
  :global(.dark-theme) .preview-pane,
  :global(.dark-theme) .symbol-toolbar {
    background-color: var(--color-gray-800);
    border-color: var(--color-gray-700);
  }
  :global(.dark-theme) .preview-header {
    border-color: var(--color-gray-700);
  }
  :global(.dark-theme) .latex-editor-textarea {
    color: var(--color-text-dark);
  }
</style>
