<!--
  @component
  MediaEditModal

  This component provides a comprehensive modal dialog for editing the attributes of media
  elements like images and YouTube videos within a Tiptap editor context. It is designed to
  handle a richer set of attributes beyond just the source URL.

  Key Improvements:
  - Edits additional attributes: 'alt' and 'title' for images; 'width', 'height', and 'start'
    time for YouTube videos.
  - Enhanced Previews: Shows an interactive YouTube thumbnail preview.
  - Robust State Management: Uses an `$effect` to sync local state if props change while the modal is open.
  - Smarter YouTube Handling: A utility function parses various YouTube URL formats to extract the video ID.
  - Controlled Component: Managed via props (`show`, `initialAttrs`, `onClose`) and a `save` event
    that dispatches all updated attributes.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // --- UI Components & Utilities ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { t } from '$lib/utils/i18n';

  // --- Component Properties (Svelte 5 Runes) ---
  let {
    /** Controls the visibility of the modal. */
    show,
    /** The initial attributes of the media to edit. Now includes optional fields. */
    initialAttrs,
    /** Callback function to close the modal. */
    onClose,
  } = $props<{
    show: boolean;
    initialAttrs: {
      src: string;
      mediaType: 'image' | 'youtube';
      alt?: string;
      title?: string;
      width?: number | null;
      height?: number | null;
      start?: number;
    };
    onClose: () => void;
  }>();

  const dispatch = createEventDispatcher<{
    save: { newAttrs: Omit<typeof initialAttrs, 'mediaType'> };
  }>();

  // --- Local State (Svelte 5 Runes) ---
  // Use separate $state runes for each editable attribute.
  let src = $state(initialAttrs.src);
  let alt = $state(initialAttrs.alt ?? '');
  let titleAttr = $state(initialAttrs.title ?? ''); // 'title' is a reserved keyword in Svelte components
  let width = $state(initialAttrs.width ?? null);
  let height = $state(initialAttrs.height ?? null);
  let start = $state(initialAttrs.start ?? 0);

  // --- Reactivity ---
  // This effect ensures that if the component is re-rendered with new initialAttrs
  // while the modal is already open, the form fields will update correctly.
  $effect(() => {
    src = initialAttrs.src;
    alt = initialAttrs.alt ?? '';
    titleAttr = initialAttrs.title ?? '';
    width = initialAttrs.width ?? null;
    height = initialAttrs.height ?? null;
    start = initialAttrs.start ?? 0;
  });

  // --- Derived State (Svelte 5 Runes) ---
  const modalTitle = $derived(
    initialAttrs.mediaType === 'image'
      ? $t('media_editor.title.image')
      : $t('media_editor.title.youtube')
  );
  const label = $derived(
    initialAttrs.mediaType === 'image'
      ? $t('media_editor.label.image')
      : $t('media_editor.label.youtube')
  );
  const isFormValid = $derived(src.trim() !== '');

  // --- YouTube Specific Logic ---
  const youtubeVideoId = $derived(getYoutubeVideoId(src));
  const youtubeThumbnailUrl = $derived(
    youtubeVideoId
      ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
      : ''
  );

  /**
   * Parses various YouTube URL formats to extract the video ID.
   * @param url The YouTube URL.
   * @returns The video ID or null if not found.
   */
  function getYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Dispatches the 'save' event with all the new attribute values.
   */
  function handleSave() {
    if (!isFormValid) return;

    // Construct the payload with all relevant attributes
    const newAttrs: Omit<typeof initialAttrs, 'mediaType'> = {
      src,
      alt: initialAttrs.mediaType === 'image' ? alt : undefined,
      title: initialAttrs.mediaType === 'image' ? titleAttr : undefined,
      width: width || null, // Send null if empty
      height: height || null,
      start: initialAttrs.mediaType === 'youtube' ? start : undefined,
    };
    dispatch('save', { newAttrs });
    onClose(); // Close modal on save
  }
</script>

<Modal title={modalTitle} {show} {onClose}>
  <div class="media-editor">
    <!-- Common Fields -->
    <div class="form-group">
      <label for="media-url">{label}</label>
      <input
        id="media-url"
        type="url"
        bind:value={src}
        placeholder="https://example.com/media"
        onkeydown={(e) => {
          if (e.key === 'Enter') handleSave();
        }}
      />
    </div>

    <!-- Image-Specific Fields -->
    {#if initialAttrs.mediaType === 'image'}
      <div class="form-group">
        <label for="media-alt">{$t('media_editor.label.alt_text')}</label>
        <input
          id="media-alt"
          type="text"
          bind:value={alt}
          placeholder={$t('media_editor.placeholder.alt_text')}
        />
      </div>
      <div class="form-group">
        <label for="media-title">{$t('media_editor.label.title_text')}</label>
        <input
          id="media-title"
          type="text"
          bind:value={titleAttr}
          placeholder={$t('media_editor.placeholder.title_text')}
        />
      </div>
    {/if}

    <!-- YouTube-Specific Fields -->
    {#if initialAttrs.mediaType === 'youtube'}
      <div class="form-group">
        <label for="media-start">{$t('media_editor.label.start_time')}</label>
        <input
          id="media-start"
          type="number"
          min="0"
          bind:value={start}
          placeholder={$t('media_editor.placeholder.start_time')}
        />
      </div>
    {/if}

    <!-- Dimension Fields (Common to both) -->
    <div class="dimension-fields">
      <div class="form-group">
        <label for="media-width">{$t('media_editor.label.width')}</label>
        <input
          id="media-width"
          type="number"
          bind:value={width}
          placeholder="Auto"
        />
      </div>
      <div class="form-group">
        <label for="media-height">{$t('media_editor.label.height')}</label>
        <input
          id="media-height"
          type="number"
          bind:value={height}
          placeholder="Auto"
        />
      </div>
    </div>

    <!-- PREVIEW AREA -->
    <div class="preview-area">
      {#if initialAttrs.mediaType === 'image' && src}
        <img {src} alt={$t('media_editor.preview.alt')} class="image-preview" />
      {:else if initialAttrs.mediaType === 'youtube' && youtubeThumbnailUrl}
        <div class="youtube-preview">
          <img
            src={youtubeThumbnailUrl}
            alt={$t('media_editor.preview.youtube_alt')}
          />
          <div class="play-icon">&#9658;</div>
        </div>
      {/if}
    </div>

    <div class="modal-actions">
      <Button on:click={onClose} variant="secondary">
        {$t('media_editor.cancel_button')}
      </Button>
      <Button on:click={handleSave} disabled={!isFormValid}>
        {$t('media_editor.save_button')}
      </Button>
    </div>
  </div>
</Modal>

<style>
  .media-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  label {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .dimension-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  .preview-area {
    margin-top: var(--space-md);
    align-self: center;
    min-height: 100px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .image-preview {
    max-width: 100%;
    max-height: 200px;
    border-radius: var(--space-sm);
    object-fit: contain;
    background-color: var(--color-gray-100);
  }

  .youtube-preview {
    position: relative;
    cursor: pointer;
    border-radius: var(--space-sm);
    overflow: hidden;
    line-height: 0;
  }

  .youtube-preview img {
    width: 100%;
    max-width: 320px;
    transition: transform 0.2s ease-in-out;
  }

  .youtube-preview:hover img {
    transform: scale(1.05);
  }

  .youtube-preview .play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 48px;
    color: white;
    background-color: rgba(0, 0, 0, 0.6);
    width: 80px;
    height: 56px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    pointer-events: none; /* So it doesn't block hover on the image */
    transition: background-color 0.2s ease;
  }

  .youtube-preview:hover .play-icon {
    background-color: rgba(255, 0, 0, 0.8);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }

  /* --- Dark Mode --- */
  :global(.dark-theme) .image-preview {
    background-color: var(--color-background-dark-raised);
  }
</style>
