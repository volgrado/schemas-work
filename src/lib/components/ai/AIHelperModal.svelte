<!-- src/lib/components/ai/AIHelperModal.svelte -->
<script lang="ts">
  import { z } from 'zod';
  import { toast } from 'svelte-sonner';

  // --- UI Components & Utilities ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import * as errorService from '$lib/services/core/errorService';
  import { t } from '$lib/utils/i18n';

  // --- Svelte 5 Props ---
  let {
    show = $bindable(false),
    title,
    prompt,
    validationSchema,
    onapply,
    onclose,
  } = $props<{
    show?: boolean;
    title: string;
    prompt: string;
    validationSchema: z.ZodSchema;
    onapply: (data: any) => void;
    onclose: () => void;
  }>();

  // --- Local State ---
  let jsonInput = $state('');
  let jsonTextarea = $state<HTMLTextAreaElement | null>(null);

  $effect(() => {
    if (show) {
      jsonInput = '';
      setTimeout(() => jsonTextarea?.focus(), 100);
    }
  });

  const parseResult = $derived(() => {
    const trimmedInput = jsonInput.trim();
    if (trimmedInput === '') {
      return { success: false as const };
    }
    try {
      const parsed = JSON.parse(trimmedInput);
      const validation = validationSchema.safeParse(parsed);
      if (validation.success) {
        return { success: true as const, data: validation.data };
      } else {
        const firstError = validation.error.issues[0];
        const errorMessage = $t('aiHelper.errors.zodValidationError', {
          path: firstError.path.join('.'),
          message: firstError.message,
        });
        return { success: false as const, error: errorMessage };
      }
    } catch (e) {
      return {
        success: false as const,
        error: $t('aiHelper.errors.notValidJson'),
      };
    }
  });

  function handleApply() {
    const result = parseResult();
    if (result.success) {
      onapply(result.data);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success($t('aiHelper.promptCopied'));
    } catch (err) {
      errorService.reportError(err, { operation: 'copyPrompt' });
      toast.error($t('aiHelper.copyError'));
    }
  }
</script>

<Modal {title} bind:show onClose={onclose}>
  <div class="assistant-container">
    <div class="step">
      <div class="step-header">
        <h4>{$t('aiHelper.step1.title')}</h4>
        <Button onclick={copyPrompt} size="sm" variant="secondary">
          <Icon name="copy" size={14} />
          {$t('common.copy')}
        </Button>
      </div>
      <p>{$t('aiHelper.step1.description')}</p>
      <Textarea readonly={true} rows={8} value={prompt} />
    </div>

    <div class="step">
      <div class="step-header"><h4>{$t('aiHelper.step2.title')}</h4></div>
      <p>{$t('aiHelper.step2.description')}</p>
      <Textarea
        bind:textareaElement={jsonTextarea}
        bind:value={jsonInput}
        rows={8}
        placeholder={$t('aiHelper.step2.placeholder')}
        class={!parseResult().success && jsonInput.trim() !== ''
          ? 'is-invalid'
          : ''}
      />
      {#if !parseResult().success && jsonInput.trim() !== ''}
        <p class="error-message">{parseResult().error}</p>
      {/if}
    </div>

    <footer class="modal-actions">
      <Button onclick={onclose} variant="secondary"
        >{$t('common.cancel')}</Button
      >
      <Button onclick={handleApply} disabled={!parseResult().success}>
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
    font-weight: 600;
  }
  .step p {
    margin: 0 0 var(--space-sm) 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }
  :global(textarea[readonly]) {
    background-color: var(--color-gray-50);
    font-family: var(--font-mono);
    font-size: 0.9rem;
    cursor: default;
  }
  :global(.is-invalid) {
    border-color: var(--color-danger) !important;
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
  :global(.dark-theme) :global(textarea[readonly]) {
    background-color: var(--color-gray-800);
  }
</style>
