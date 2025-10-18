<!--
  @component
  MediaEditModal

  This component provides a simple modal dialog for editing the source URL of media elements
  like images and YouTube videos. It dynamically adapts its text and functionality based on the
  media type it is configured to edit.

  Key Features:
  - Displays a text input for the media's source URL (`src`).
  - Dynamically changes the modal title and input label based on whether it's editing an 'image' or a 'youtube' video, using Svelte 5's `$derived` for reactivity.
  - Shows a preview of the image directly within the modal if the media type is 'image' and a valid URL is entered.
  - Operates as a controlled component, managed through props (`show`, `initialAttrs`, `onClose`) and a `save` event.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // --- UI Components & Utilities ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { t } from '$lib/utils/i18n';

  // --- Component Properties (Svelte 5 Runes) ---
  // FIX: Replaced `export let` with the `$props()` rune.
  let { show, initialAttrs, onClose } = $props<{
    show: boolean;
    initialAttrs: { src: string; mediaType: 'image' | 'youtube' };
    onClose: () => void;
  }>();

  const dispatch = createEventDispatcher<{
    save: { newAttrs: { src: string } };
  }>();

  // --- Local State (Svelte 5 Runes) ---
  // FIX: Used `$state` for mutable local state.
  let src = $state(initialAttrs.src); // The URL being edited.

  // --- Derived State (Svelte 5 Runes) ---
  // These values reactively update if the initialAttrs prop were to ever change.
  const title = $derived(
    initialAttrs.mediaType === 'image'
      ? $t('media_editor.title.image')
      : $t('media_editor.title.youtube')
  );
  const label = $derived(
    initialAttrs.mediaType === 'image'
      ? $t('media_editor.label.image')
      : $t('media_editor.label.youtube')
  );

  /**
   * Dispatches the 'save' event with the new src value.
   */
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
      placeholder="https://example.com/image.png"
      onkeydown={(e) => {
        if (e.key === 'Enter') handleSave();
      }}
    />

    <!-- Show a preview only for images with a valid src -->
    {#if initialAttrs.mediaType === 'image' && src}
      <img {src} alt={$t('media_editor.preview.alt')} class="image-preview" />
    {/if}

    <div class="modal-actions">
      <Button on:click={onClose} variant="secondary">
        {$t('media_editor.cancel_button')}
      </Button>
      <Button on:click={handleSave}>{$t('media_editor.save_button')}</Button>
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
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    padding: var(--space-sm);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-border-input);
    background-color: var(--color-background);
    color: var(--color-text);
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }

  input:focus-visible {
    outline: none;
    border-color: var(--color-accent);
  }

  .image-preview {
    max-width: 100%;
    max-height: 200px;
    border-radius: var(--space-sm);
    object-fit: contain;
    margin-top: var(--space-md);
    align-self: center;
    background-color: var(--color-gray-100);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }

  /* --- Dark Mode --- */
  @media (prefers-color-scheme: dark) {
    input {
      background-color: var(--color-background-dark);
      border-color: var(--color-border-input-dark);
    }
    .image-preview {
      background-color: var(--color-background-dark-raised);
    }
  }
</style>
