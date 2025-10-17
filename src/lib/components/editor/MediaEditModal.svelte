<!-- src/lib/components/editor/MediaEditModal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  export let show: boolean;
  export let initialAttrs: { src: string; mediaType: 'image' | 'youtube' };
  export let onClose: () => void;

  const dispatch = createEventDispatcher();
  let src = initialAttrs.src;

  const title =
    initialAttrs.mediaType === 'image' ? 'Edit Image URL' : 'Edit YouTube URL';
  const label =
    initialAttrs.mediaType === 'image' ? 'Image URL' : 'YouTube Video URL';

  function handleSave() {
    dispatch('save', { newAttrs: { src } });
  }
</script>

<Modal {title} {show} {onClose}>
  <div class="media-editor">
    <label for="media-url">{label}</label>
    <input
      id="media-url"
      type="url"
      bind:value={src}
      placeholder="https://..."
    />

    {#if initialAttrs.mediaType === 'image' && src}
      <img {src} alt="Preview" class="image-preview" />
    {/if}

    <div class="modal-actions">
      <Button on:click={onClose} variant="secondary">Cancel</Button>
      <Button on:click={handleSave}>Save</Button>
    </div>
  </div>
</Modal>

<style>
  .media-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  label {
    font-weight: 600;
  }
  input {
    width: 100%;
    padding: var(--space-sm);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-gray-200);
  }
  .image-preview {
    max-width: 100%;
    max-height: 200px;
    border-radius: var(--space-sm);
    object-fit: contain;
    margin-top: var(--space-md);
    align-self: center;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }
</style>
