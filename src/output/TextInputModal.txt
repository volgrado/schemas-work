<!-- src/lib/components/ui/TextInputModal.svelte -->
<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  // Use the new `$props.Callbacks` type for event handlers in Svelte 5
  type Props = {
    show: boolean;
    title: string;
    placeholder?: string;
    onClose: () => void;
    // The event dispatcher for when the user submits text
    onsubmit: (text: string) => void;
  };

  let { show, title, placeholder, onClose, onsubmit }: Props = $props();

  let inputText = $state('');

  function handleSubmit() {
    // FIX 1: Check if the onsubmit handler was actually provided before calling it.
    if (inputText.trim() && onsubmit) {
      onsubmit(inputText.trim());
    }
  }
</script>

<!-- FIX 2: Use the new `onsubmit` event attribute instead of the deprecated `on:submit` directive -->
<Modal {title} {show} {onClose}>
  <form onsubmit={handleSubmit} class="text-input-form">
    <textarea bind:value={inputText} {placeholder} rows="10" required
    ></textarea>
    <div class="modal-actions">
      <Button on:click={onClose} variant="secondary">Cancel</Button>
      <Button type="submit">Generate</Button>
    </div>
  </form>
</Modal>

<style>
  .text-input-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  textarea {
    width: 100%;
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background-color: var(--color-background-secondary);
    font-family: var(--font-mono);
    font-size: 0.9rem;
    resize: vertical;
    min-height: 150px;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }
</style>
