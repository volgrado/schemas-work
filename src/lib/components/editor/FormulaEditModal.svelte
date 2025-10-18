<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import katex from 'katex';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { debounce } from '$lib/utils/debounce';
  import { t } from '$lib/services/i18n';

  export let show: boolean;
  export let initialAttrs: { formula: string };
  export let onClose: () => void;

  const dispatch = createEventDispatcher();
  let formulaText = initialAttrs.formula;
  let previewEl: HTMLElement;

  const updatePreview = debounce(() => {
    if (previewEl) {
      try {
        katex.render(formulaText, previewEl, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (e) {
        previewEl.textContent = $t('formula_editor.error_rendering');
      }
    }
  }, 200);

  onMount(updatePreview);

  function handleSave() {
    dispatch('save', { newAttrs: { formula: formulaText } });
  }

  $: if (formulaText !== initialAttrs.formula) {
    updatePreview();
  }
</script>

<Modal title={$t('formula_editor.title')} {show} {onClose}>
  <div class="formula-editor-grid">
    <div class="editor-pane">
      <label for="formula-input">{$t('formula_editor.label')}</label>
      <textarea id="formula-input" bind:value={formulaText} rows="4"></textarea>
      <div class="modal-actions">
        <Button on:click={onClose} variant="secondary">
          {$t('formula_editor.cancel_button')}
        </Button>
        <Button on:click={handleSave}>{$t('formula_editor.save_button')}</Button>
      </div>
    </div>
    <div class="right-pane">
      <div class="preview-pane">
        <h4>{$t('formula_editor.preview_title')}</h4>
        <div class="preview-box" bind:this={previewEl}></div>
      </div>
      <div class="help-pane">
        <h4>{$t('formula_editor.help_title')}</h4>
        <ul>
          <li>
            {$t('formula_editor.help.fractions')} <code>{String.raw`\frac{a}{b}`}</code>
          </li>
          <li>
            {$t('formula_editor.help.superscript')} <code>{'x^2'}</code>
          </li>
          <li>
            {$t('formula_editor.help.subscript')} <code>{'H_2O'}</code>
          </li>
          <li>
            {$t('formula_editor.help.square_root')} <code>{String.raw`\sqrt{x}`}</code>
          </li>
          <li>
            {$t('formula_editor.help.summation')} <code>{String.raw`\sum_{i=1}^n`}</code>
          </li>
          <li>
            {$t('formula_editor.help.greek_letters')} <code>{String.raw`\alpha, \beta, \gamma`}</code>
          </li>
        </ul>
      </div>
    </div>
  </div>
</Modal>

<style>
  .formula-editor-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }

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

  label {
    font-weight: 600;
    font-size: 0.9rem;
  }

  textarea {
    width: 100%;
    padding: var(--space-sm);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-gray-200);
    font-family: monospace;
    font-size: 1rem;
    background-color: var(--color-gray-100);
    color: var(--color-text);
  }

  .preview-pane,
  .help-pane {
    background-color: var(--color-gray-100);
    border-radius: var(--space-sm);
    padding: var(--space-md);
  }

  h4 {
    margin: 0 0 var(--space-sm) 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .preview-box {
    min-height: 50px;
    display: grid;
    place-items: center;
    font-size: 1.2rem;
    overflow-x: auto;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  code {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }

  @media (prefers-color-scheme: dark) {
    textarea,
    .preview-pane,
    .help-pane {
      background-color: var(--color-gray-200);
      border-color: var(--color-gray-500);
    }
    code {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
</style>
