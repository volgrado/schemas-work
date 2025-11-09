<!-- src/lib/components/ui/TextInputModal.svelte -->
<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte'; // Assuming a spinner icon is available

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

  const isSubmitDisabled = !inputText.trim() || loading;
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
          <Icon name="loader" size={18} />
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
    gap: var(
      --space-lg
    ); /* ENHANCEMENT: Increased gap for better breathing room */
  }

  /*
	  ENHANCEMENT: All textarea styling is now inherited from the global app.css.
	  This makes the component simpler and ensures perfect design consistency.
	  The only style we need is to override the default font.
	*/
  textarea {
    font-family: var(--font-mono);
    min-height: 120px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }
</style>
