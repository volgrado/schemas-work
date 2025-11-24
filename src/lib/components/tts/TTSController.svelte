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
    toggleSettings,
  } from '$lib/stores/ttsStore.svelte';
  import { nodeDetailState } from '$lib/stores/nodeDetailStore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';
  import { t } from '$lib/utils/i18n';

  // --- Props ---
  let { embedded = false } = $props<{ embedded?: boolean }>();

  // --- SVELTE 5 DERIVED STATE ---
  const progress = $derived(() => {
    const nodes = ttsState.nodesToRead;
    if (!nodes || nodes.length === 0) return 0;
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
      const activeElement = document.activeElement;
      if (
        activeElement &&
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName)
      ) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          handleTogglePause();
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (
            ttsState.nodesToRead &&
            ttsState.currentNodeIndex < ttsState.nodesToRead.length - 1
          ) {
            nextNode();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (ttsState.currentNodeIndex > 0) {
            previousNode();
          }
          break;
      }
    }

    if (ttsState.status !== 'idle') {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  });
</script>

<!-- The controller renders when TTS is active. 
     If global (not embedded), it hides when the detail panel is open. 
     If embedded, it always shows (controlled by parent). -->
{#if ttsState.status !== 'idle' && (embedded || !nodeDetailState.isOpen)}
  {#if embedded}
    <div
      class="panel embedded"
      role="region"
      aria-label={$t('tts.controller_region_aria_label')}
      aria-live="polite"
    >
      <div class="content-wrapper">
        {@render content()}
      </div>
    </div>
  {:else}
    <div
      class="panel floating"
      transition:fly={{ y: 50, duration: 400, easing: quintOut }}
      role="region"
      aria-label={$t('tts.controller_region_aria_label')}
      aria-live="polite"
    >
      <!-- Progress Bar Background -->
      <div class="progress-track">
        <div class="progress-fill" style="width: {progress}%"></div>
      </div>
      
      <div class="content-wrapper">
        {@render content()}
      </div>
    </div>
  {/if}
{/if}

{#snippet content()}
  {#if ttsState.status === 'initializing'}
    <div class="status-view">
      <Spinner size="sm" />
      <span class="status-text">{$t('tts.initializing')}</span>
    </div>
  {:else if ttsState.status === 'error'}
    <div class="status-view error">
      <div class="error-message">
        <Icon name="alert-triangle" size={18} class="text-danger" />
        <span class="status-text">{ttsState.error || $t('tts.error')}</span>
      </div>
      <Button onclick={stopReading} variant="ghost" size="sm" class="close-btn">
        <Icon name="x" size={18} />
      </Button>
    </div>
  {:else}
    <div class="controls-view">
      <div class="main-controls">
        <!-- Text Info -->
        <div class="info-section">
          <p class="current-text" title={currentTitle()}>
            {#if ttsState.nodesToRead.length > 0}
              <span class="section-badge">
                {ttsState.nodesToRead[ttsState.currentNodeIndex]?.hierarchicalIndex ?? '#'}
              </span>
            {/if}
            <span class="title-text">{currentTitle()}</span>
          </p>
        </div>

        <!-- Playback Controls -->
        <div class="playback-actions">
           <Button
            onclick={previousNode}
            variant="ghost"
            size="sm"
            disabled={ttsState.currentNodeIndex === 0}
            aria-label={$t('tts.previous_node')}
            class="control-btn secondary"
          >
            <Icon name="skip-back" size={20} />
          </Button>

          <Button
            onclick={handleTogglePause}
            variant="primary"
            size="lg"
            aria-label={ttsState.status === 'paused' ? $t('tts.play') : $t('tts.pause')}
            class="play-pause-btn"
          >
            <Icon
              name={ttsState.status === 'paused' ? 'play' : 'pause'}
              size={24}
              fill="currentColor"
            />
          </Button>

          <Button
            onclick={nextNode}
            variant="ghost"
            size="sm"
            disabled={ttsState.nodesToRead && ttsState.currentNodeIndex >= ttsState.nodesToRead.length - 1}
            aria-label={$t('tts.next_node')}
            class="control-btn secondary"
          >
            <Icon name="skip-forward" size={20} />
          </Button>
        </div>

        <!-- Secondary Actions -->
        <div class="secondary-actions">
           <Button
            onclick={replay}
            variant="ghost"
            size="sm"
            aria-label={$t('tts.replay')}
            class="control-btn tertiary"
            title={$t('tts.replay')}
          >
            <Icon name="rotate-ccw" size={18} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onclick={toggleSettings}
            aria-label={ttsState.isSettingsExpanded ? $t('tts.collapse') : $t('tts.expand')}
            aria-expanded={ttsState.isSettingsExpanded}
            aria-controls="tts-settings-panel"
            class="control-btn tertiary {ttsState.isSettingsExpanded ? 'active' : ''}"
            title="Settings"
          >
            <Icon name="sliders" size={18} />
          </Button>

          <Button
            onclick={stopReading}
            variant="ghost"
            size="sm"
            aria-label={$t('tts.stop')}
            class="control-btn tertiary danger-hover"
            title={$t('tts.stop')}
          >
            <Icon name="x" size={18} />
          </Button>
        </div>
      </div>

      {#if ttsState.isSettingsExpanded}
        <div
          class="settings-panel"
          id="tts-settings-panel"
          transition:slide={{ duration: 300, easing: quintOut }}
        >
          <div class="setting-group">
            <div class="setting-header">
              <Icon name="mic" size={14} class="text-muted" />
              <label for="voice-select">{$t('tts.voice')}</label>
            </div>
            <div class="select-wrapper">
              <select
                id="voice-select"
                class="premium-select"
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
              <Icon name="chevron-down" size={14} class="select-arrow" />
            </div>
          </div>

          <div class="sliders-row">
            <div class="setting-group slider-group">
              <div class="setting-header">
                <Icon name="zap" size={14} class="text-muted" />
                <label for="rate-slider">{$t('tts.speed')} <span class="value-badge">{ttsState.rate.toFixed(1)}x</span></label>
              </div>
              <input
                id="rate-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={ttsState.rate}
                oninput={onRateChange}
                class="premium-slider"
              />
            </div>

            <div class="setting-group slider-group">
              <div class="setting-header">
                <Icon name="volume-2" size={14} class="text-muted" />
                <label for="volume-slider">{$t('common.volume')}</label>
              </div>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={ttsState.volume}
                oninput={onVolumeChange}
                class="premium-slider"
              />
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

<style>
  /* --- Panel Container --- */
  .panel {
    display: flex;
    flex-direction: column;
    background-color: var(--color-background-translucent);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--color-border);
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .panel.floating {
    position: fixed;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-command-bar);
    width: 90%;
    max-width: 600px;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl), 0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .panel.embedded {
    width: 100%;
    background: transparent;
    border: none;
    backdrop-filter: none;
    padding: 0;
  }

  .content-wrapper {
    padding: var(--space-sm) var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  /* --- Progress Bar --- */
  .progress-track {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(0, 0, 0, 0.05);
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent), var(--color-accent-hover));
    box-shadow: 0 0 10px var(--color-accent);
    transition: width 0.3s linear;
  }

  /* --- Status View --- */
  .status-view {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    color: var(--color-text-secondary);
    font-weight: 500;
    font-size: 0.85rem;
  }

  .status-view.error {
    justify-content: space-between;
    color: var(--color-danger);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  /* --- Controls Layout --- */
  .main-controls {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-sm);
  }

  /* Info Section */
  .info-section {
    overflow: hidden;
    min-width: 0;
  }

  .current-text {
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .section-badge {
    background: var(--color-background-raised);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    padding: 1px 4px;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-family: var(--font-mono);
    font-weight: 600;
  }

  /* Playback Actions */
  .playback-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  :global(.play-pause-btn) {
    width: 40px !important;
    height: 40px !important;
    border-radius: 50% !important;
    background: var(--color-accent) !important;
    color: white !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 4px 12px rgba(var(--color-accent-hsl), 0.4) !important;
    transition: transform 0.1s ease, box-shadow 0.2s ease !important;
  }

  :global(.play-pause-btn:hover) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(var(--color-accent-hsl), 0.5) !important;
  }

  :global(.play-pause-btn:active) {
    transform: scale(0.95);
  }

  :global(.control-btn) {
    color: var(--color-text-secondary) !important;
    transition: color 0.2s, background-color 0.2s !important;
    border-radius: var(--radius-full) !important;
    width: 28px !important;
    height: 28px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  :global(.control-btn:hover) {
    color: var(--color-text) !important;
    background-color: var(--color-background-raised) !important;
  }

  :global(.control-btn.active) {
    color: var(--color-accent) !important;
    background-color: var(--color-background-raised) !important;
  }

  :global(.control-btn.danger-hover:hover) {
    color: var(--color-danger) !important;
    background-color: var(--color-danger-bg) !important;
  }

  /* Secondary Actions */
  .secondary-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }

  /* --- Settings Panel --- */
  .settings-panel {
    margin-top: var(--space-sm);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .setting-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .value-badge {
    margin-left: auto;
    background: var(--color-background-raised);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  /* Custom Select */
  .select-wrapper {
    position: relative;
  }

  .premium-select {
    width: 100%;
    appearance: none;
    background-color: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    padding-right: 32px;
    font-size: 0.9rem;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s;
  }

  .premium-select:hover {
    border-color: var(--color-gray-400);
  }

  .premium-select:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(var(--color-accent-hsl), 0.2);
  }

  :global(.select-arrow) {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--color-text-secondary);
  }

  /* Sliders Row */
  .sliders-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg);
  }

  /* Custom Range Slider */
  .premium-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    outline: none;
    margin: 10px 0;
  }

  .premium-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--color-accent);
    cursor: pointer;
    transition: transform 0.1s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .premium-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .premium-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--color-accent);
    cursor: pointer;
    transition: transform 0.1s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  /* --- Responsive Adjustments --- */
  @media (max-width: 640px) {
    .panel.floating {
      bottom: var(--space-sm);
      left: 50%;
      width: calc(100% - 32px); /* Full width minus margins */
      max-width: none;
      border-radius: var(--radius-lg);
      /* Ensure we don't overlap the FAB which is usually at bottom-right */
      margin-bottom: 0; 
    }

    .content-wrapper {
      padding: var(--space-sm) var(--space-md);
    }

    /* Keep single row layout on mobile */
    .main-controls {
      grid-template-columns: 1fr auto auto;
      gap: var(--space-xs);
    }

    .info-section {
      min-width: 0;
      overflow: hidden;
    }
    
    .current-text {
      font-size: 0.8rem;
    }

    .section-badge {
      font-size: 0.65rem;
      padding: 1px 3px;
    }

    .playback-actions {
      gap: var(--space-xs);
    }

    .secondary-actions {
      gap: 2px;
    }
    
    :global(.play-pause-btn) {
      width: 36px !important;
      height: 36px !important;
    }

    :global(.control-btn) {
      width: 26px !important;
      height: 26px !important;
    }
    
    .sliders-row {
      grid-template-columns: 1fr;
      gap: var(--space-md);
    }
  }
</style>
