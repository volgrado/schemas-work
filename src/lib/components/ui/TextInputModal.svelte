<!-- src/lib/components/ui/TextInputModal.svelte -->
<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';

  type Props = {
    show: boolean;
    title: string;
    placeholder?: string;
    submitLabel?: string;
    cancelLabel?: string;
    onClose: () => void;
    // ENHANCEMENT: The onsubmit handler can now be async, allowing for API calls.
    onsubmit: (text: string) => Promise<void> | void;
  };

  const {
    show,
    title,
    placeholder = '',
    submitLabel = 'Generate',
    cancelLabel = 'Cancel',
    onClose,
    onsubmit,
  }: Props = $props();

  let inputText = $state('');
  let loading = $state(false);
  let textareaElement: HTMLTextAreaElement | null = $state(null);

  /**
   * ENHANCEMENT: Auto-focus the textarea when the modal becomes visible.
   * This is a huge UX improvement.
   */
  $effect(() => {
    if (show) {
      // Use a timeout to ensure the element is focusable after the transition
      setTimeout(() => {
        textareaElement?.focus();
      }, 100);
    }
  });

  function closeAndReset() {
    onClose();
    // Use a timeout to reset state after the closing animation completes
    setTimeout(() => {
      inputText = '';
      loading = false;
    }, 300);
  }

  async function handleSubmit() {
    if (!inputText.trim() || loading) return;

    loading = true;
    try {
      await onsubmit(inputText.trim());
      closeAndReset(); // Close and reset only on success
    } catch (error) {
      console.error('Submission failed:', error);
      // Optionally, show an error toast to the user here
    } finally {
      // Ensure loading is always turned off, even if the promise rejects
      loading = false;
    }
  }

  /**
   * ENHANCEMENT: Allow form submission with Ctrl+Enter or Cmd+Enter
   * for a better power-user experience.
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const isSubmitDisabled = $derived(!inputText.trim() || loading);
</script>

<Modal {title} {show} onClose={closeAndReset}>
  <form onsubmit={handleSubmit} class="text-input-form">
    <textarea
      bind:this={textareaElement}
      bind:value={inputText}
      {placeholder}
      rows="8"
      required
      disabled={loading}
      onkeydown={handleKeydown}
    ></textarea>
    <div class="modal-actions">
      <Button onclick={closeAndReset} variant="secondary" disabled={loading}
        >{cancelLabel}</Button
      >
      <Button type="submit" disabled={isSubmitDisabled}>
        {#if loading}
          <Spinner size="sm" />
          <span>Saving...</span>
        {:else}
          {submitLabel}
        {/if}
      </Button>
    </div>
  </form>
</Modal>

<style>
  .text-input-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  textarea {
    font-family: var(--font-mono);
    min-height: 120px;
    background-color: var(--color-background); /* Ensure contrast */
    border: 1px solid var(--color-border-input);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  textarea:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px hsl(var(--color-accent-hsl) / 0.2);
    outline: none;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }
</style>
