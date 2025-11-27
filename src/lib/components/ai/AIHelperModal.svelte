<!--
  @component
  AIHelperModal

  @description
  A generic, lower-level utility modal for manual AI interaction workflows.
  Unlike the "Strategy Session" which is automated, this modal guides the user through
  a manual copy-paste loop with an external AI (e.g., ChatGPT, Claude).

  Features:
  - **Step 1:** Displays the generated prompt for the user to copy.
  - **Step 2:** Provides a text area for pasting the AI's JSON response.
  - **Validation:** Real-time Zod schema validation of the pasted JSON.
  - **Application:** Applies the validated data via a callback.

  @props
  - `show` (bindable boolean): Visibility control.
  - `title` (string): Header title.
  - `prompt` (string): The text to be copied.
  - `validationSchema` (ZodSchema): The schema to validate the response against.
  - `onapply` (function): Success callback with validated data.
  - `onclose` (function): Close callback.
-->
<script lang="ts">
  import { z } from 'zod';
  import { toast } from 'svelte-sonner';

  // --- UI Components ---
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Textarea from '$lib/core/ui/Textarea.svelte';
  import * as errorService from '$lib/core/services/errorService';
  import { i18n } from '$lib/utils/i18n.svelte';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validationSchema: z.ZodSchema<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onapply: (data: any) => void;
    onclose: () => void;
  }>();

  // --- State ---
  let jsonInput = $state('');
  let jsonTextarea = $state<HTMLTextAreaElement | null>(null);

  // --- Effects ---
  $effect(() => {
    if (show) {
      jsonInput = '';
      // Auto-focus the input area when modal opens (UX improvement)
      setTimeout(() => jsonTextarea?.focus(), 100);
    }
  });

  // --- Logic ---
  // Derived state: Parse and validate the input JSON in real-time
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
        // Format Zod error for display
        const firstError = validation.error.issues[0];
        const errorMessage = i18n.t('aiHelper.errors.zodValidationError', {
          path: firstError.path.join('.'),
          message: firstError.message,
        });
        return { success: false as const, error: errorMessage };
      }
    } catch (e) {
      return {
        success: false as const,
        error: i18n.t('aiHelper.errors.notValidJson'),
      };
    }
  });

  // --- Actions ---

  function handleApply() {
    const result = parseResult();
    if (result.success) {
      onapply(result.data);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success(i18n.t('aiHelper.promptCopied'));
    } catch (err) {
      errorService.reportError(err, { operation: 'copyPrompt' });
      toast.error(i18n.t('aiHelper.copyError'));
    }
  }
</script>

<Modal {title} bind:show onClose={onclose}>
  <div class="assistant-container">

    <!-- Step 1: Copy Prompt -->
    <div class="step">
      <div class="step-header">
        <h4>{i18n.t('aiHelper.step1.title')}</h4>
        <Button onclick={copyPrompt} size="sm" variant="secondary">
          <Icon name="copy" size={14} />
          {i18n.t('common.copy')}
        </Button>
      </div>
      <p>{i18n.t('aiHelper.step1.description')}</p>
      <!-- Read-only textarea for the prompt text -->
      <Textarea readonly={true} rows={8} value={prompt} />
    </div>

    <!-- Step 2: Paste Response -->
    <div class="step">
      <div class="step-header"><h4>{i18n.t('aiHelper.step2.title')}</h4></div>
      <p>{i18n.t('aiHelper.step2.description')}</p>
      <Textarea
        bind:textareaElement={jsonTextarea}
        bind:value={jsonInput}
        rows={8}
        placeholder={i18n.t('aiHelper.step2.placeholder')}
        invalid={!parseResult().success && jsonInput.trim() !== ''}
      />

      <!-- Validation Error Message -->
      {#if !parseResult().success && jsonInput.trim() !== ''}
        <p class="error-message">{parseResult().error}</p>
      {/if}
    </div>

    <!-- Footer Actions -->
    <footer class="modal-actions">
      <Button onclick={onclose} variant="secondary"
        >{i18n.t('common.cancel')}</Button
      >
      <Button onclick={handleApply} disabled={!parseResult().success}>
        {i18n.t('common.applyChanges')}
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
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-md);
  }
  :global(.dark-theme) :global(textarea[readonly]) {
    background-color: var(--color-background-raised);
  }
</style>
