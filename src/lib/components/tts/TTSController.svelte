<!--
  @component
  TTSController

  Provides a complete UI for Text-to-Speech functionality, including playback
  controls and management of the document's offline state.
-->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { get, derived } from 'svelte/store';

  // --- Stores, UI Components, and Utilities ---
  import { ttsStore } from '$lib/stores/ttsStore';
  import { documentStore } from '$lib/stores/documentStore';
  import {
    offlineStore,
    type OfflineDocStatus,
  } from '$lib/stores/offlineStore';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';

  // --- DERIVED STORES & REACTIVE STATE ---

  /**
   * Derives the offline status of the current document.
   * Updates automatically when the document or offline store changes.
   */
  const docStatus = derived(
    [documentStore, offlineStore],
    ([$documentStore, $offlineStore], set) => {
      if ($documentStore.docId) {
        offlineStore.getDocStatus($documentStore.docId).then(set);
      } else {
        set('not_downloaded');
      }
    },
    'not_downloaded' as OfflineDocStatus // Default initial value
  );

  /**
   * Reactively derives the title of the current node being read.
   */
  $: currentTitle =
    ($ttsStore.status === 'playing' || $ttsStore.status === 'paused') &&
    $ttsStore.nodesToRead[$ttsStore.currentNodeIndex]
      ? ($ttsStore.nodesToRead[$ttsStore.currentNodeIndex].title ?? '...')
      : '...';

  /**
   * Reactively calculates the playback progress as a percentage.
   */
  $: progress =
    $ttsStore.nodesToRead.length > 0
      ? (($ttsStore.currentNodeIndex + 1) / $ttsStore.nodesToRead.length) * 100
      : 0;

  /**
   * Tooltip text for disabled settings when an offline file is active.
   * This is empty when settings are not disabled, so no tooltip appears.
   */
  $: settingsTooltip =
    $docStatus === 'downloaded' ? $t('offline.tooltip.settings_disabled') : '';

  // --- EVENT HANDLERS ---

  /**
   * Handles the offline status button action (download, delete, etc.).
   */
  function handleOfflineAction() {
    const docId = get(documentStore).docId;
    const voiceId = get(ttsStore).selectedVoiceId;
    if (!docId || !voiceId) return;

    if ($docStatus === 'not_downloaded' || $docStatus === 'outdated') {
      offlineStore.downloadDocument(docId, voiceId);
    } else if ($docStatus === 'downloaded') {
      offlineStore.deleteOfflineDocument(docId);
    }
  }

  /**
   * Toggles between playing and pausing the TTS playback.
   */
  function handleTogglePause() {
    const currentStatus = get(ttsStore).status;
    if (currentStatus === 'paused') {
      ttsStore.resumeReading();
    } else if (currentStatus === 'playing') {
      ttsStore.pauseReading();
    }
  }

  /**
   * Handles changes to the voice selection dropdown.
   */
  function onVoiceChange(e: Event) {
    const newVoiceId = (e.currentTarget as HTMLSelectElement).value;
    ttsStore.setVoice(newVoiceId);
  }

  /**
   * Handles changes to the speech rate slider.
   */
  function onRateChange(e: Event) {
    const newRate = parseFloat((e.currentTarget as HTMLInputElement).value);
    ttsStore.setRate(newRate);
  }
</script>

<!-- The controller only renders when TTS is not 'idle'. -->
{#if $ttsStore.status !== 'idle'}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
    aria-live="polite"
  >
    <!-- PLAYBACK Progress Bar -->
    {#if $ttsStore.status === 'playing' || $ttsStore.status === 'paused'}
      <div class="progress-container">
        <div class="progress-bar" style="width: {progress}%" />
      </div>
    {/if}

    <!-- DOWNLOAD Progress Bar -->
    {#if $offlineStore.status === 'downloading'}
      <div class="progress-container download-progress">
        <div
          class="progress-bar download-bar"
          style="width: {$offlineStore.downloadProgress}%"
        />
      </div>
    {/if}

    <div class="content-wrapper">
      {#if $ttsStore.status === 'initializing'}
        <div class="status-view">
          <Icon name="loader" size={20} class="spinner" />
          <span class="status-text">{$t('tts.initializing')}</span>
        </div>
      {:else if $ttsStore.status === 'error'}
        <div class="status-view error">
          <Icon name="alert-triangle" size={20} />
          <span class="status-text">{$ttsStore.error || $t('tts.error')}</span>
          <Button onclick={ttsStore.stopReading} variant="ghost" size="sm"
            >{$t('common.close')}</Button
          >
        </div>
      {:else if $ttsStore.status === 'playing' || $ttsStore.status === 'paused'}
        <div class="controls-view">
          <div class="main-controls">
            <!-- OFFLINE status and action button -->
            <div
              class="offline-status"
              title={$t(`offline.tooltip.${$docStatus}`)}
            >
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                on:click={handleOfflineAction}
                disabled={$offlineStore.status === 'downloading'}
                aria-label={$t(`offline.status.${$docStatus}`)}
              >
                {#if $offlineStore.status === 'downloading'}
                  <Icon name="loader" size={18} class="spinner" />
                {:else if $docStatus === 'downloaded'}
                  <Icon name="check-circle" size={18} class="icon-success" />
                {:else if $docStatus === 'outdated'}
                  <Icon name="refresh-cw" size={18} class="icon-warning" />
                {:else}
                  <Icon name="download-cloud" size={18} />
                {/if}
              </Button>
            </div>

            <p class="current-text" title={currentTitle}>
              <span class="progress-indicator"
                >{$ttsStore.currentNodeIndex + 1} / {$ttsStore.nodesToRead
                  .length}</span
              >
              {currentTitle}
            </p>

            <div class="actions">
              <Button
                onclick={ttsStore.previousNode}
                variant="ghost"
                size="md"
                disabled={$ttsStore.currentNodeIndex === 0}
                aria-label={$t('tts.previous_node')}
                ><Icon name="skip-back" size={18} /></Button
              >
              <Button
                onclick={handleTogglePause}
                variant="secondary"
                size="md"
                aria-label={$ttsStore.status === 'paused'
                  ? $t('tts.play')
                  : $t('tts.pause')}
                ><Icon
                  name={$ttsStore.status === 'paused' ? 'play' : 'pause'}
                  size={18}
                /></Button
              >
              <Button
                onclick={ttsStore.nextNode}
                variant="ghost"
                size="md"
                disabled={$ttsStore.currentNodeIndex >=
                  $ttsStore.nodesToRead.length - 1}
                aria-label={$t('tts.next_node')}
                ><Icon name="skip-forward" size={18} /></Button
              >
              <Button
                onclick={ttsStore.stopReading}
                variant="ghost"
                size="md"
                aria-label={$t('tts.stop')}
                ><Icon name="x-circle" size={18} /></Button
              >
            </div>
          </div>

          <div class="settings">
            <div class="setting-item" title={settingsTooltip}>
              <label for="voice-select"
                ><Icon name="mic" size={14} /> {$t('tts.voice')}</label
              >
              <select
                id="voice-select"
                class="ui-select"
                value={$ttsStore.selectedVoiceId}
                onchange={onVoiceChange}
                disabled={$ttsStore.availableVoices.length === 0 ||
                  $docStatus === 'downloaded'}
              >
                {#each $ttsStore.availableVoices as voice (voice.id)}
                  <option value={voice.id}>{voice.name}</option>
                {/each}
              </select>
            </div>
            <div class="setting-item" title={settingsTooltip}>
              <label for="rate-slider"
                ><Icon name="fast-forward" size={14} />
                {$t('tts.speed', { rate: $ttsStore.rate.toFixed(1) })}</label
              >
              <input
                id="rate-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={$ttsStore.rate}
                oninput={onRateChange}
                disabled={$docStatus === 'downloaded'}
              />
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* --- Base Panel and Layout --- */
  .panel {
    position: fixed;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-command-bar);
    width: 90%;
    max-width: 650px;
    border-radius: var(--space-md);
    background-color: var(--color-background-translucent);
    backdrop-filter: blur(12px) saturate(150%);
    -webkit-backdrop-filter: blur(12px) saturate(150%);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
  }
  .content-wrapper {
    padding: var(--space-md) var(--space-lg);
  }

  /* --- Progress Bars --- */
  .progress-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: var(--color-background-faint);
  }
  .progress-bar {
    height: 100%;
    background: var(--color-accent);
    border-radius: 0 2px 2px 0;
    transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .download-progress {
    top: 4px; /* Position below playback bar */
    height: 3px;
    background-color: transparent;
  }
  .download-bar {
    background: var(--color-orange-500);
  }

  /* --- Status and Controls --- */
  .status-view {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-sm) 0;
    color: var(--color-text-secondary);
  }
  .status-view.error {
    color: var(--color-danger);
    justify-content: space-between;
  }
  .controls-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  /* --- Main Controls Area --- */
  .main-controls {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-md);
  }
  .offline-status {
    flex-shrink: 0;
  }
  .current-text {
    flex-grow: 1;
    margin: 0;
    font-size: 0.95rem;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .progress-indicator {
    display: inline-block;
    background-color: var(--color-gray-100);
    color: var(--color-text-secondary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-right: var(--space-sm);
  }
  .actions {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
    flex-shrink: 0;
  }

  /* --- Settings Area --- */
  .settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-md);
  }
  .setting-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .setting-item label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ui-select {
    width: 100%;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-border-input);
    background-color: var(--color-background);
    color: var(--color-text);
  }
  .ui-select:disabled,
  input[type='range']:disabled {
    opacity: 0.6;
  }

  /* --- UX Improvement for Disabled Settings --- */
  .setting-item[title]:not([title='']) {
    cursor: not-allowed;
  }
  .setting-item[title]:not([title='']) > * {
    pointer-events: none; /* Prevents interaction with child elements */
  }

  /* --- Icons and Animations --- */
  .icon-success {
    color: var(--color-green-500);
  }
  .icon-warning {
    color: var(--color-orange-500);
  }
  .spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* --- Theming and Responsive Design --- */
  @media (prefers-color-scheme: dark) {
    .settings {
      border-top-color: var(--color-border-dark);
    }
    .progress-indicator {
      background-color: var(--color-gray-800);
      color: var(--color-text-dark-secondary);
    }
  }
  @media (max-width: 640px) {
    .content-wrapper {
      padding: var(--space-md);
    }
    .main-controls {
      grid-template-columns: 1fr;
      gap: var(--space-md);
      position: relative; /* For positioning the offline button */
    }
    .current-text {
      text-align: center;
      order: 1;
    }
    .actions {
      justify-content: center;
      order: 2;
    }
    .offline-status {
      position: absolute;
      top: -4px; /* Align with text area */
      left: 0;
    }
    .settings {
      grid-template-columns: 1fr;
    }
  }
</style>
