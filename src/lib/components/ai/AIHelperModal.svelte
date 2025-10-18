<!--
  @component
  AIHelperModal

  This component provides a guided, two-step modal for interacting with an external AI model.
  It is designed to help users generate structured data (like flashcards) by providing a pre-formatted prompt
  and a text area to paste the AI's JSON response.

  Workflow:
  1.  **Step 1: Copy Prompt** - The modal displays a prompt that the user can copy. This prompt is designed to be
      pasted into an external AI chatbot (e.g., ChatGPT, Gemini).
  2.  **Step 2: Paste Response** - The user pastes the JSON response from the AI into a second textarea.
  3.  **Validation** - As the user pastes the content, the component reactively parses the JSON and validates it against
      a provided Zod schema (`validationSchema`).
  4.  **Apply** - If validation is successful, the user can apply the changes, which dispatches an `apply` event
      with the validated data.

  Key Features:
  - Zod-based validation for ensuring the AI's output matches the expected data structure.
  - Real-time feedback on the validity of the pasted JSON.
  - User-friendly error messages for both JSON parsing and Zod validation failures.
  - Integrated error reporting to a service for better diagnostics.
  - Toast notifications for user feedback (e.g., successful copy).
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { z } from 'zod';
  import { toast } from 'svelte-sonner';

  // --- UI Components & Utilities ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import * as errorService from '$lib/services/core/errorService';
  import { t } from '$lib/utils/i18n';

  // --- Component Properties ---
  export let show: boolean = false;
  export let title: string;
  export let prompt: string; // The AI prompt to be copied.
  export let validationSchema: z.ZodSchema; // The Zod schema to validate the JSON against.

  const dispatch = createEventDispatcher<{ apply: any; close: void }>();

  // --- Local State ---
  let jsonInput = '';
  let parseResult: { success: boolean; data?: any; error?: string } = { success: false };

  /**
   * This reactive block is the core of the component's validation logic.
   * It runs whenever `jsonInput` changes.
   */
  $: {
    if (jsonInput.trim() === '') {
      parseResult = { success: false }; // Reset if input is empty.
    } else {
      try {
        const parsed = JSON.parse(jsonInput);
        const validation = validationSchema.safeParse(parsed);

        if (validation.success) {
          parseResult = { success: true, data: validation.data };
        } else {
          // Report the specific Zod validation error for diagnostics.
          errorService.reportError(validation.error, {
            operation: 'parseAiJsonResponse.zodValidation',
            rawInput: jsonInput, // Log the problematic input.
          });

          const firstError = validation.error.issues[0];
          const errorMessage = t('aiHelper.errors.zodValidationError', { 
            path: firstError.path.join('.'), 
            message: firstError.message 
          });
          parseResult = { success: false, error: errorMessage };
        }
      } catch (e) {
        // Report JSON parsing errors.
        errorService.reportError(e, {
          operation: 'parseAiJsonResponse.jsonParse',
          rawInput: jsonInput,
        });
        parseResult = { success: false, error: t('aiHelper.errors.notValidJson') };
      }
    }
  }

  /**
   * Dispatches the 'apply' event with the validated data.
   */
  function handleApply() {
    if (parseResult.success) {
      dispatch('apply', parseResult.data);
    }
  }

  /**
   * Resets state and dispatches the 'close' event.
   */
  function handleClose() {
    jsonInput = '';
    dispatch('close');
  }

  /**
   * Copies the generated prompt to the clipboard and provides user feedback.
   */
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success(t('aiHelper.promptCopied'));
    } catch (err) {
      errorService.reportError(err, { operation: 'copyPrompt' });
      toast.error(t('aiHelper.copyError'));
    }
  }
</script>

<Modal {title} {show} {onClose} bind:show>
  <div class="assistant-container">
    <!-- Step 1: Copy Prompt -->
    <div class="step">
      <div class="step-header">
        <h4>{t('aiHelper.step1.title')}</h4>
        <Button on:click={copyPrompt} size="sm" variant="secondary">
          <Icon name="copy" size={14} />
          {t('common.copy')}
        </Button>
      </div>
      <p>{t('aiHelper.step1.description')}</p>
      <textarea readonly rows="8">{prompt}</textarea>
    </div>

    <!-- Step 2: Paste JSON Response -->
    <div class="step">
      <div class="step-header">
        <h4>{t('aiHelper.step2.title')}</h4>
      </div>
      <p>{t('aiHelper.step2.description')}</p>
      <textarea
        bind:value={jsonInput}
        rows="8"
        placeholder={t('aiHelper.step2.placeholder')}
        class:is-invalid={!parseResult.success && jsonInput.trim() !== ''}
      ></textarea>
      <!-- Display validation error message -->
      {#if !parseResult.success && jsonInput.trim() !== ''}
        <p class="error-message">{parseResult.error}</p>
      {/if}
    </div>

    <footer class="modal-actions">
      <Button on:click={handleClose} variant="secondary">{t('common.cancel')}</Button>
      <Button on:click={handleApply} disabled={!parseResult.success}>
        {t('common.applyChanges')}
      </Button>
    </footer>
  </div>
</Modal>

<style>
  .assistant-container { display: flex; flex-direction: column; gap: var(--space-lg); }
  .step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xs); }
  .step-header h4 { margin: 0; font-weight: 600; }
  .step p { margin: 0 0 var(--space-sm) 0; font-size: 0.9rem; color: var(--color-gray-600); }
  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: var(--space-sm);
    border: 1px solid var(--color-border-input);
    border-radius: var(--space-sm);
    font-family: var(--font-mono);
    font-size: 0.9rem;
    background-color: var(--color-background);
    color: var(--color-text);
    resize: vertical;
    transition: border-color 0.2s;
  }
  textarea:focus { outline: none; border-color: var(--color-accent); }
  textarea[readonly] { background-color: var(--color-gray-50); }

  .is-invalid { border-color: var(--color-danger); }
  .error-message { color: var(--color-danger); font-size: 0.85rem; margin-top: var(--space-xs); }
  .modal-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-md); }

  @media (prefers-color-scheme: dark) {
    .step p { color: var(--color-gray-400); }
    textarea { background-color: var(--color-background-dark); border-color: var(--color-border-input-dark); }
    textarea[readonly] { background-color: var(--color-background-dark-raised); }
  }
</style>
