<!--
  @component
  TTSController

  This component provides a user interface for the Text-to-Speech (TTS) feature.
  It appears as a floating panel at the bottom of the screen when TTS is active,
  allowing the user to control playback, see progress, and adjust settings.

  The component is entirely driven by the `ttsStore`, which manages the state
  of the TTS engine, the queue of nodes to read, and user preferences like
  voice and rate.

  Features:
  - Displays the title of the currently spoken text node.
  - Shows progress through the reading queue with a progress bar and text indicator.
  - Provides controls: play/pause, next/previous node, and stop.
  - Allows users to select from available system voices.
  - Allows users to adjust the speech rate.
  - Handles different states: initializing, playing, paused, error, and idle.
-->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { get } from 'svelte/store';

  // --- Stores, UI Components, and Utilities ---
  import { ttsStore } from '$lib/stores/ttsStore';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';

  // --- Reactive State Derivations ---

  /**
   * Reactively derives the title of the current node being read.
   * Defaults to '...' if TTS is not active or the title is unavailable.
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

  // --- Event Handlers ---

  /**
   * Toggles between playing and pausing the TTS playback.
   * It reads the latest state from the store to decide which action to take.
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
   * @param {Event} e - The change event from the select element.
   */
  function onVoiceChange(e: Event) {
    const newVoiceId = (e.currentTarget as HTMLSelectElement).value;
    ttsStore.setVoice(newVoiceId);
  }

  /**
   * Handles changes to the speech rate slider.
   * @param {Event} e - The input event from the range slider.
   */
  function onRateChange(e: Event) {
    const newRate = parseFloat((e.currentTarget as HTMLInputElement).value);
    ttsStore.setRate(newRate);
  }
</script>

<!-- The controller is only rendered when the TTS status is not 'idle'. -->
{#if $ttsStore.status !== 'idle'}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
    aria-live="polite"
  >
    <!-- Progress bar shown during playback -->
    {#if $ttsStore.status === 'playing' || $ttsStore.status === 'paused'}
      <div class="progress-container">
        <div class="progress-bar" style="width: {progress}%"></div>
      </div>
    {/if}

    <div class="content-wrapper">
      <!-- Initializing state -->
      {#if $ttsStore.status === 'initializing'}
        <div class="status-view">
          <Icon name="loader" size={20} class="spinner" />
          <span class="status-text">{$t('tts.initializing')}</span>
        </div>
        <!-- Error state -->
      {:else if $ttsStore.status === 'error'}
        <div class="status-view error">
          <Icon name="alert-triangle" size={20} />
          <span class="status-text">{$ttsStore.error || $t('tts.error')}</span
          ><Button onclick={ttsStore.stopReading} variant="ghost" size="sm"
            >{$t('common.close')}</Button
          >
        </div>
        <!-- Active playback (playing or paused) state -->
      {:else if $ttsStore.status === 'playing' || $ttsStore.status === 'paused'}
        <div class="controls-view">
          <!-- Main controls: title and action buttons -->
          <div class="main-controls">
            <p class="current-text" title={currentTitle}>
              <span class="progress-indicator"
                >{$ttsStore.currentNodeIndex + 1} / {$ttsStore.nodesToRead
                  .length}</span
              >{currentTitle}
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
          <!-- Settings for voice and speed -->
          <div class="settings">
            <div class="setting-item">
              <label for="voice-select"
                ><Icon name="mic" size={14} /> {$t('tts.voice')}</label
              >
              <select
                id="voice-select"
                class="ui-select"
                value={$ttsStore.selectedVoiceId}
                onchange={onVoiceChange}
                disabled={$ttsStore.availableVoices.length === 0}
              >
                {#each $ttsStore.availableVoices as voice (voice.id)}<option
                    value={voice.id}>{voice.name}</option
                  >{/each}
              </select>
            </div>
            <div class="setting-item">
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
              />
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
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

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .spinner {
    animation: spin 1s linear infinite;
  }

  .controls-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .main-controls {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: var(--space-lg);
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

  /* --- Dark Mode --- */
  @media (prefers-color-scheme: dark) {
    .settings {
      border-top-color: var(--color-border-dark);
    }
    .progress-indicator {
      background-color: var(--color-gray-800);
      color: var(--color-text-dark-secondary);
    }
  }

  /* --- Responsive Design --- */
  @media (max-width: 640px) {
    .content-wrapper {
      padding: var(--space-md);
    }
    .main-controls {
      grid-template-columns: 1fr;
      gap: var(--space-md);
    }
    .current-text {
      text-align: center;
    }
    .actions {
      justify-content: center;
    }
    .settings {
      grid-template-columns: 1fr;
    }
  }
</style>
