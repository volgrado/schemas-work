<!--
  @component
  MediaEditModal

  @description
  An exceptional, production-ready modal for editing media attributes (images, YouTube).
  It features a robust, reactive design with autofocus, unsaved changes protection,
  and a polished UI, all built with modern Svelte 5 patterns.
-->
<script lang="ts">
  // --- UI Components & Utilities ---
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  // --- Type Definitions ---
  type MediaAttributes = {
    src: string;
    mediaType: 'image' | 'youtube';
    alt?: string;
    title?: string;
    width?: number | null;
    height?: number | null;
    start?: number;
  };

  // --- Svelte 5 Props and Events ---
  let {
    show = $bindable(false),
    initialAttrs,
    onsave,
  } = $props<{
    show?: boolean;
    initialAttrs: MediaAttributes;
    onsave: (newAttrs: Omit<MediaAttributes, 'mediaType'>) => void;
  }>();

  // --- State ---
  let attrs = $state<Omit<MediaAttributes, 'mediaType'>>({ src: '' });
  let srcInputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (show) {
      attrs = {
        src: initialAttrs.src,
        alt: initialAttrs.alt ?? '',
        title: initialAttrs.title ?? '',
        width: initialAttrs.width ?? null,
        height: initialAttrs.height ?? null,
        start: initialAttrs.start ?? 0,
      };
      setTimeout(() => srcInputEl?.focus(), 100);
    }
  });

  // --- Derived State ---
  const modalTitle = $derived(
    initialAttrs.mediaType === 'image'
      ? i18n.t('media_editor.title.image')
      : i18n.t('media_editor.title.youtube')
  );
  const isFormValid = $derived(attrs.src.trim() !== '');

  const hasUnsavedChanges = $derived(() => {
    const original = {
      src: initialAttrs.src,
      alt: initialAttrs.alt ?? '',
      title: initialAttrs.title ?? '',
      width: initialAttrs.width ?? null,
      height: initialAttrs.height ?? null,
      start: initialAttrs.start ?? 0,
    };
    return JSON.stringify(attrs) !== JSON.stringify(original);
  });

  function requestClose() {
    // FIX: `$derived` with a function creates a getter. We must CALL it to get the value.
    if (hasUnsavedChanges()) {
      if (confirm(i18n.t('quickCardEditor.unsavedChangesConfirm'))) {
        show = false;
      }
    } else {
      show = false;
    }
  }

  // --- YouTube Specific Logic ---
  const youtubeVideoId = $derived(getYoutubeVideoId(attrs.src));
  const youtubeThumbnailUrl = $derived(
    youtubeVideoId
      ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
      : ''
  );

  function getYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  function handleSave() {
    if (!isFormValid) return;

    const newAttrs = {
      src: attrs.src,
      alt: initialAttrs.mediaType === 'image' ? attrs.alt : undefined,
      title: initialAttrs.mediaType === 'image' ? attrs.title : undefined,
      width: attrs.width || null,
      height: attrs.height || null,
      start: initialAttrs.mediaType === 'youtube' ? attrs.start : undefined,
    };

    onsave(newAttrs);
    show = false;
  }
</script>

<Modal title={modalTitle} bind:show onClose={requestClose}>
  <div class="media-editor">
    <div class="form-group">
      <label for="media-url"
        >{initialAttrs.mediaType === 'image'
          ? i18n.t('media_editor.label.image')
          : i18n.t('media_editor.label.youtube')}</label
      >
      <input
        id="media-url"
        type="url"
        bind:this={srcInputEl}
        bind:value={attrs.src}
        placeholder="https://example.com/media"
        onkeydown={(e) => {
          if (e.key === 'Enter') handleSave();
        }}
      />
    </div>

    {#if initialAttrs.mediaType === 'image'}
      <div class="form-group">
        <label for="media-alt">{i18n.t('media_editor.label.alt_text')}</label>
        <input
          id="media-alt"
          type="text"
          bind:value={attrs.alt}
          placeholder={i18n.t('media_editor.placeholder.alt_text')}
        />
      </div>
      <div class="form-group">
        <label for="media-title"
          >{i18n.t('media_editor.label.title_text')}</label
        >
        <input
          id="media-title"
          type="text"
          bind:value={attrs.title}
          placeholder={i18n.t('media_editor.placeholder.title_text')}
        />
      </div>
    {/if}

    {#if initialAttrs.mediaType === 'youtube'}
      <div class="form-group">
        <label for="media-start"
          >{i18n.t('media_editor.label.start_time')}</label
        >
        <input
          id="media-start"
          type="number"
          min="0"
          bind:value={attrs.start}
          placeholder={i18n.t('media_editor.placeholder.start_time')}
        />
      </div>
    {/if}

    <div class="dimension-fields">
      <div class="form-group">
        <label for="media-width">{i18n.t('media_editor.label.width')}</label>
        <input
          id="media-width"
          type="number"
          bind:value={attrs.width}
          placeholder="Auto"
        />
      </div>
      <div class="form-group">
        <label for="media-height">{i18n.t('media_editor.label.height')}</label>
        <input
          id="media-height"
          type="number"
          bind:value={attrs.height}
          placeholder="Auto"
        />
      </div>
    </div>

    <div class="preview-area">
      {#if initialAttrs.mediaType === 'image' && attrs.src}
        <img
          src={attrs.src}
          alt={i18n.t('media_editor.preview.alt')}
          class="image-preview"
        />
      {:else if initialAttrs.mediaType === 'youtube' && youtubeThumbnailUrl}
        <div class="youtube-preview">
          <img
            src={youtubeThumbnailUrl}
            alt={i18n.t('media_editor.preview.youtube_alt')}
          />
          <div class="play-icon">&#9658;</div>
        </div>
      {/if}
    </div>

    <div class="modal-actions">
      <Button onclick={requestClose} variant="secondary"
        >{i18n.t('media_editor.cancel_button')}</Button
      >
      <Button onclick={handleSave} disabled={!isFormValid}
        >{i18n.t('media_editor.save_button')}</Button
      >
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
    color: var(--color-text-secondary);
  }
  .dimension-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }
  .preview-area {
    margin-top: var(--space-sm);
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
    border-radius: var(--border-radius-sm);
    object-fit: contain;
    background-color: var(--color-gray-100);
  }
  .youtube-preview {
    position: relative;
    cursor: pointer;
    border-radius: var(--border-radius-sm);
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
    pointer-events: none;
    transition: background-color 0.2s ease;
  }
  .youtube-preview:hover .play-icon {
    background-color: rgba(255, 0, 0, 0.8);
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-md);
  }
  :global(.dark-theme) .image-preview {
    background-color: var(--color-gray-800);
  }
  /* Removed redundant dark theme overrides */
</style>
