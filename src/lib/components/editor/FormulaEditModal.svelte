<!--
  @component
  FormulaEditModal

  This component provides a modal dialog for editing mathematical formulas using LaTeX syntax.
  It features a live preview that updates as the user types, rendered by the KaTeX library.

  Key Features:
  - A split-view layout with a textarea for LaTeX input on one side and a preview/help pane on the other.
  - Live rendering of the formula using KaTeX, with a debounce mechanism to optimize performance.
  - Graceful error handling for invalid LaTeX syntax, displaying an error message instead of crashing.
  - A quick-reference guide for common LaTeX commands to assist users.
  - It is a controlled component, managed via props and events (`show`, `onClose`, `save` event).
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import katex from 'katex';

  // --- UI Components & Utilities ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { debounce } from '$lib/utils/debounce';
  import { t } from '$lib/utils/i18n';

  // --- Component Properties ---
  export let show: boolean; // Controls the visibility of the modal.
  export let initialAttrs: { formula: string }; // The initial formula to edit.
  export let onClose: () => void; // Callback function to close the modal.

  const dispatch = createEventDispatcher<{ save: { newAttrs: { formula: string } } }>();

  // --- Local State ---
  let formulaText = initialAttrs.formula; // The current formula being edited.
  let previewEl: HTMLElement; // The DOM element where the KaTeX preview is rendered.

  /**
   * Renders the formula in the preview element using KaTeX.
   * This function is debounced to avoid re-rendering on every keystroke, improving performance.
   */
  const updatePreview = debounce(() => {
    if (previewEl) {
      try {
        katex.render(formulaText, previewEl, {
          throwOnError: false, // Prevents KaTeX from throwing an error on invalid syntax.
          displayMode: true,   // Renders the formula in a block format.
        });
      } catch (e) {
        // Display a user-friendly error message in the preview box if rendering fails.
        previewEl.textContent = t('formula_editor.error_rendering');
      }
    }
  }, 200); // 200ms debounce interval.

  // Render the initial formula when the component mounts.
  onMount(updatePreview);

  /**
   * Dispatches the 'save' event with the updated formula text.
   */
  function handleSave() {
    dispatch('save', { newAttrs: { formula: formulaText } });
  }

  // A reactive statement that triggers the preview update whenever the formula text changes.
  $: if (formulaText !== initialAttrs.formula) {
    updatePreview();
  }
</script>

<Modal title={t('formula_editor.title')} {show} {onClose}>
  <div class="formula-editor-grid">
    <!-- Left Pane: Editor -->
    <div class="editor-pane">
      <label for="formula-input">{t('formula_editor.label')}</label>
      <textarea id="formula-input" bind:value={formulaText} rows="4" placeholder="E = mc^2"></textarea>
      <div class="modal-actions">
        <Button on:click={onClose} variant="secondary">
          {t('formula_editor.cancel_button')}
        </Button>
        <Button on:click={handleSave}>{t('formula_editor.save_button')}</Button>
      </div>
    </div>
    
    <!-- Right Pane: Preview and Help -->
    <div class="right-pane">
      <div class="preview-pane">
        <h4>{t('formula_editor.preview_title')}</h4>
        <div class="preview-box" bind:this={previewEl}></div>
      </div>
      <div class="help-pane">
        <h4>{t('formula_editor.help_title')}</h4>
        <ul>
          <li>{t('formula_editor.help.fractions')} <code>{String.raw`\frac{a}{b}`}</code></li>
          <li>{t('formula_editor.help.superscript')} <code>x^2</code></li>
          <li>{t('formula_editor.help.subscript')} <code>H_2O</code></li>
          <li>{t('formula_editor.help.square_root')} <code>{String.raw`\sqrt{x}`}</code></li>
          <li>{t('formula_editor.help.summation')} <code>{String.raw`\sum_{i=1}^n`}</code></li>
          <li>{t('formula_editor.help.greek_letters')} <code>{String.raw`\alpha, \beta, \gamma`}</code></li>
        </ul>
      </div>
    </div>
  </div>
</Modal>

<style>
  /* Main grid layout for the modal content */
  .formula-editor-grid {
    display: grid;
    grid-template-columns: 1fr; /* Single column on small screens */
    gap: var(--space-lg);
  }

  /* Two-column layout on larger screens */
  @media (min-width: 640px) {
    .formula-editor-grid {
      grid-template-columns: 2fr 1fr;
    }
  }

  .editor-pane,
  .right-pane {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  label { font-weight: 600; font-size: 0.9rem; }

  textarea {
    width: 100%;
    padding: var(--space-sm);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-border-input);
    font-family: monospace;
    font-size: 1rem;
    background-color: var(--color-background);
    color: var(--color-text);
    resize: vertical;
    min-height: 80px;
  }

  .preview-pane,
  .help-pane {
    background-color: var(--color-gray-50);
    border-radius: var(--space-sm);
    padding: var(--space-md);
  }

  h4 { margin: 0 0 var(--space-sm) 0; font-size: 0.9rem; font-weight: 600; }

  .preview-box {
    min-height: 50px;
    display: grid;
    place-items: center;
    font-size: 1.2rem;
    overflow-x: auto;
    padding: var(--space-sm);
  }

  ul { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; display: flex; flex-direction: column; gap: var(--space-sm); }
  code { background-color: var(--color-gray-200); padding: 2px 4px; border-radius: 4px; font-family: monospace; }

  .modal-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: auto; /* Pushes buttons to the bottom */ }

  /* --- Dark Mode --- */
  @media (prefers-color-scheme: dark) {
    textarea { background-color: var(--color-background-dark); border-color: var(--color-border-input-dark); }
    .preview-pane, .help-pane { background-color: var(--color-background-dark-raised); border: 1px solid var(--color-border-dark); }
    code { background-color: var(--color-gray-700); }
  }
</style>
