<!-- src/lib/components/tts/TTSController.svelte -->
<script lang="ts">
  import { fly, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- Stores, UI Components, and Utilities ---
  import {
    ttsState,
    resumeReading,
    pauseReading,
    setVoice,
    setRate,
    setVolume,
    replay,
    previousNode,
    nextNode,
    stopReading,
  } from '$lib/stores/ttsStore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';

  // --- Local UI State ---
  /** Tracks whether the settings panel is visible or collapsed. */
  let isExpanded = $state(true);

  // --- SVELTE 5 DERIVED STATE ---
  const progress = $derived(() => {
    const nodes = ttsState.nodesToRead;
    if (!nodes || nodes.length === 0) return 0;
    // This correctly calculates overall progress for the bar.
    return ((ttsState.currentNodeIndex + 1) / nodes.length) * 100;
  });

  const currentTitle = $derived(() => {
    const { status, nodesToRead, currentNodeIndex } = ttsState;
    const currentNode = nodesToRead?.[currentNodeIndex];
    if ((status === 'playing' || status === 'paused') && currentNode) {
      return currentNode.title ?? '...';
    }
    return '...';
  });

  // --- EVENT HANDLERS ---
  function handleTogglePause() {
    if (ttsState.status === 'paused') {
      resumeReading();
    } else if (ttsState.status === 'playing') {
      pauseReading();
    }
  }

  function onVoiceChange(e: Event) {
    if (ttsState.availableVoices.length === 0) return;
    const newVoiceId = (e.currentTarget as HTMLSelectElement).value;
    setVoice(newVoiceId);
  }

  function onRateChange(e: Event) {
    const newRate = parseFloat((e.currentTarget as HTMLInputElement).value);
    setRate(newRate);
  }

  function onVolumeChange(e: Event) {
    const newVolume = parseFloat((e.currentTarget as HTMLInputElement).value);
    setVolume(newVolume);
  }

  // --- KEYBOARD SHORTCUTS ---
  $effect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore shortcuts if the user is focused on a form element
      const activeElement = document.activeElement;
      if (
        activeElement &&
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName)
      ) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault(); // Prevent page from scrolling
          handleTogglePause();
          break;
        case 'ArrowRight':
          event.preventDefault();
          // Check if next is not disabled before calling
          if (
            ttsState.nodesToRead &&
            ttsState.currentNodeIndex < ttsState.nodesToRead.length - 1
          ) {
            nextNode();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          // Check if previous is not disabled before calling
          if (ttsState.currentNodeIndex > 0) {
            previousNode();
          }
          break;
      }
    }

    // Only add the listener when the controller is active
    if (ttsState.status !== 'idle') {
      window.addEventListener('keydown', handleKeyDown);

      // Svelte 5's $effect automatically returns a cleanup function
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  });
</script>

<!-- The controller only renders when TTS is not 'idle'. -->
{#if ttsState.status !== 'idle'}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
    role="region"
    aria-label={$t('tts.controller_region_aria_label')}
    aria-live="polite"
  >
    <div class="progress-container">
      <div class="progress-bar" style="width: {progress}%"></div>
    </div>

    <div class="content-wrapper">
      {#if ttsState.status === 'initializing'}
        <div class="status-view">
          <Icon name="loader" size={20} class="spinner" />
          <span class="status-text">{$t('tts.initializing')}</span>
        </div>
      {:else if ttsState.status === 'error'}
        <div class="status-view error">
          <Icon name="alert-triangle" size={20} />
          <span class="status-text">{ttsState.error || $t('tts.error')}</span>
          <Button onclick={stopReading} variant="ghost" size="sm">
            {$t('common.close')}
          </Button>
        </div>
      {:else}
        <!-- Main Controls View for Playing/Paused States -->
        <div class="controls-view">
          <div class="main-controls">
            <p class="current-text" title={currentTitle()}>
              {#if ttsState.nodesToRead.length > 0}
                <span class="progress-indicator">
                  {$t('tts.section_indicator', {
                    index:
                      ttsState.nodesToRead[ttsState.currentNodeIndex]
                        ?.hierarchicalIndex ?? '…',
                  })}
                </span>
              {/if}
              {currentTitle()}
            </p>

            <div class="actions">
              <!-- Media Controls -->
              <Button
                onclick={replay}
                variant="ghost"
                size="md"
                aria-label={$t('tts.replay')}
              >
                <Icon name="rotate-ccw" size={18} />
              </Button>
              <Button
                onclick={previousNode}
                variant="ghost"
                size="md"
                disabled={ttsState.currentNodeIndex === 0}
                aria-label={$t('tts.previous_node')}
              >
                <Icon name="skip-back" size={18} />
              </Button>
              <Button
                onclick={handleTogglePause}
                variant="secondary"
                size="md"
                aria-label={ttsState.status === 'paused'
                  ? $t('tts.play')
                  : $t('tts.pause')}
              >
                <Icon
                  name={ttsState.status === 'paused' ? 'play' : 'pause'}
                  size={20}
                />
              </Button>
              <Button
                onclick={nextNode}
                variant="ghost"
                size="md"
                disabled={ttsState.nodesToRead &&
                  ttsState.currentNodeIndex >= ttsState.nodesToRead.length - 1}
                aria-label={$t('tts.next_node')}
              >
                <Icon name="skip-forward" size={18} />
              </Button>
              <Button
                onclick={stopReading}
                variant="ghost"
                size="md"
                aria-label={$t('tts.stop')}
              >
                <Icon name="x-circle" size={18} />
              </Button>
              <!-- Collapse Button -->
              <Button
                variant="ghost"
                size="md"
                onclick={() => (isExpanded = !isExpanded)}
                aria-label={isExpanded ? $t('tts.collapse') : $t('tts.expand')}
                aria-expanded={isExpanded}
                aria-controls="tts-settings-panel"
              >
                <Icon
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                />
              </Button>
            </div>
          </div>

          {#if isExpanded}
            <div
              class="settings"
              id="tts-settings-panel"
              transition:slide={{ duration: 250, easing: quintOut }}
            >
              <div class="setting-item">
                <label for="voice-select"
                  ><Icon name="mic" size={14} /> {$t('tts.voice')}</label
                >
                <select
                  id="voice-select"
                  class="ui-select"
                  value={ttsState.selectedVoiceId}
                  onchange={onVoiceChange}
                  disabled={ttsState.availableVoices.length === 0}
                >
                  {#if ttsState.availableVoices.length === 0}
                    <option value="">{$t('tts.no_voices')}</option>
                  {/if}
                  {#each ttsState.availableVoices as voice (voice.id)}
                    <option value={voice.id}>{voice.name}</option>
                  {/each}
                </select>
              </div>
              <div class="setting-item">
                <label for="rate-slider"
                  ><Icon name="fast-forward" size={14} />
                  {$t('tts.speed', { rate: ttsState.rate.toFixed(1) })}</label
                >
                <input
                  id="rate-slider"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={ttsState.rate}
                  oninput={onRateChange}
                />
              </div>
              <div class="setting-item">
                <label for="volume-slider"
                  ><Icon name="volume-2" size={14} />
                  {$t('common.volume')}</label
                >
                <input
                  id="volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={ttsState.volume}
                  oninput={onVolumeChange}
                />
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* All your styles are correct and do not need to be changed. */
  .panel {
    position: fixed;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-command-bar);
    width: 90%;
    max-width: 700px;
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
    text-align: left;
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
    align-items: center;
    gap: var(--space-xs);
    flex-shrink: 0;
  }
  .settings {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
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
  :global(.spinner) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 640px) {
    .main-controls {
      grid-template-columns: 1fr;
      gap: var(--space-md);
    }
    .current-text {
      text-align: center;
      margin-bottom: 0;
    }
    .actions {
      justify-content: center;
    }
    .settings {
      grid-template-columns: 1fr;
    }
  }
  :global(.dark-theme) .panel {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .progress-indicator {
    background-color: var(--color-gray-700);
    color: var(--color-text-dark-secondary);
  }
  :global(.dark-theme) .settings {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .ui-select {
    border-color: var(--color-border-dark);
    background-color: var(--color-background-dark);
    color: var(--color-text-dark);
  }
</style>
