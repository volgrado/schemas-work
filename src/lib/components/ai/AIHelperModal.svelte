<!-- src/lib/components/ai/AIHelperModal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { z } from 'zod';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  import * as errorService from '$lib/services/core/errorService'; // *** 1. IMPORT ***
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/utils/i18n';

  export let show: boolean = false;
  export let title: string;
  export let prompt: string;
  export let validationSchema: z.ZodSchema;

  const dispatch = createEventDispatcher();

  let jsonInput = '';
  let parseResult: { success: boolean; data?: any; error?: string } = {
    success: false,
  };

  $: {
    if (jsonInput.trim() === '') {
      parseResult = { success: false };
    } else {
      try {
        const parsed = JSON.parse(jsonInput);
        const validation = validationSchema.safeParse(parsed);
        if (validation.success) {
          parseResult = { success: true, data: validation.data };
        } else {
          // *** NEW: Report the Zod validation error ***
          errorService.reportError(validation.error, {
            operation: 'parseAiJsonResponse.zodValidation',
            rawInput: jsonInput, // Log what the user pasted
          });

          const firstError = validation.error.issues[0];
          const errorMessage = `Error in '${firstError.path.join('.')}': ${firstError.message}`;
          parseResult = {
            success: false,
            error: errorMessage || $t('aiHelper.errors.jsonFormatIncorrect'),
          };
        }
      } catch (e) {
        // *** NEW: Report the JSON parsing error ***
        errorService.reportError(e, {
          operation: 'parseAiJsonResponse.jsonParse',
          rawInput: jsonInput, // Log what the user pasted
        });

        parseResult = {
          success: false,
          error: $t('aiHelper.errors.notValidJson'),
        };
      }
    }
  }

  function handleApply() {
    if (parseResult.success) {
      dispatch('apply', parseResult.data);
    }
  }

  function handleClose() {
    jsonInput = '';
    dispatch('close');
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      // *** IMPROVEMENT: Give feedback to the user ***
      toast.success($t('aiHelper.promptCopied'));
    } catch (err) {
      // *** 2. REPLACE console.error ***
      errorService.reportError(err, { operation: 'copyPrompt' });
      toast.error($t('aiHelper.copyError'));
    }
  }
</script>

<Modal {title} {show} onClose={handleClose}>
  <div class="assistant-container">
    <!-- STEP 1 -->
    <div class="step">
      <div class="step-header">
        <h4>{$t('aiHelper.step1.title')}</h4>
        <Button on:click={copyPrompt} size="sm" variant="secondary">
          <Icon name="copy" size={14} />
          {$t('common.copy')}
        </Button>
      </div>
      <p>{$t('aiHelper.step1.description')}</p>
      <textarea readonly rows="8">{prompt}</textarea>
    </div>

    <!-- STEP 2 -->
    <div class="step">
      <div class="step-header">
        <h4>{$t('aiHelper.step2.title')}</h4>
      </div>
      <p>{$t('aiHelper.step2.description')}</p>
      <textarea
        bind:value={jsonInput}
        rows="8"
        placeholder={$t('aiHelper.step2.placeholder')}
        class:is-invalid={!parseResult.success && jsonInput.trim() !== ''}
      ></textarea>
      {#if !parseResult.success && jsonInput.trim() !== ''}
        <p class="error-message">{parseResult.error}</p>
      {/if}
    </div>

    <footer class="modal-actions">
      <Button on:click={handleClose} variant="secondary">{$t('common.cancel')}</Button>
      <Button on:click={handleApply} disabled={!parseResult.success}>
        {$t('common.applyChanges')}
      </Button>
    </footer>
  </div>
</Modal>

<style>
  .assistant-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xs);
  }
  .step-header h4 {
    margin: 0;
  }
  .step p {
    margin: 0 0 var(--space-sm) 0;
    font-size: 0.9rem;
    color: var(--color-gray-500);
  }
  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: var(--space-sm);
    margin-top: var(--space-sm);
    border: none;
    border-radius: 12px;
    font-family: var(--font-main);
    font-size: 0.95rem;
    background-color: rgba(0, 0, 0, 0.04);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
    resize: vertical;
  }
  textarea:focus {
    outline: 2px solid var(--color-accent);
  }
  .is-invalid {
    outline: 2px solid var(--color-danger);
  }
  .error-message {
    color: var(--color-danger);
    font-size: 0.85rem;
    margin-top: var(--space-xs);
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }

  @media (prefers-color-scheme: dark) {
    textarea {
      background-color: rgba(255, 255, 255, 0.08);
      color: white;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
  }
</style>
