<!-- src/lib/components/features/TTSController.svelte (REFACTORED FOR EXPLICIT REACTIVITY) -->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { ttsStore } from '$lib/stores/ttsStore';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // REFACTORED: Use $derived for each piece of state to ensure explicit reactivity.
  let status = $derived($ttsStore.status);
  let error = $derived($ttsStore.error);
  let nodesToRead = $derived($ttsStore.nodesToRead);
  let currentNodeIndex = $derived($ttsStore.currentNodeIndex);
  let availableVoices = $derived($ttsStore.availableVoices);
  let selectedVoiceId = $derived($ttsStore.selectedVoiceId);
  let rate = $derived($ttsStore.rate);

  // MODIFIED: This now derives the TITLE of the current node for display.
  let currentTitle = $derived(
    status === 'playing' || status === 'paused'
      ? (nodesToRead[currentNodeIndex]?.title ?? '...')
      : '...'
  );

  let progress = $derived(
    nodesToRead.length > 0
      ? ((currentNodeIndex + 1) / nodesToRead.length) * 100
      : 0
  );

  function handleTogglePause() {
    if (status === 'paused') {
      ttsStore.resumeReading();
    } else if (status === 'playing') {
      ttsStore.pauseReading();
    }
  }

  function onVoiceChange(e: Event) {
    const newVoiceId = (e.currentTarget as HTMLSelectElement).value;
    ttsStore.setVoice(newVoiceId);
  }

  function onRateChange(e: Event) {
    const newRate = parseFloat((e.currentTarget as HTMLInputElement).value);
    ttsStore.setRate(newRate);
  }
</script>

{#if status !== 'idle'}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
    aria-live="polite"
  >
    {#if status === 'playing' || status === 'paused'}
      <div class="progress-container">
        <div class="progress-bar" style="width: {progress}%"></div>
      </div>
    {/if}

    <div class="content-wrapper">
      {#if status === 'initializing'}
        <div class="status-view">
          <Icon name="loader" size={20} class="spinner" />
          <span class="status-text">Inicializando motor de audio...</span>
        </div>
      {:else if status === 'error'}
        <div class="status-view error">
          <Icon name="alert-triangle" size={20} />
          <span class="status-text">{error || 'Ha ocurrido un error'}</span>
          <Button onclick={ttsStore.stopReading} variant="ghost" size="sm"
            >Cerrar</Button
          >
        </div>
      {:else if status === 'playing' || status === 'paused'}
        <div class="controls-view">
          <div class="main-controls">
            <!-- MODIFIED: Display the `currentTitle` instead of the full text -->
            <p class="current-text" title={currentTitle}>
              <span class="progress-indicator">
                {currentNodeIndex + 1} / {nodesToRead.length}
              </span>
              {currentTitle}
            </p>
            <div class="actions">
              <Button
                onclick={ttsStore.previousNode}
                variant="ghost"
                size="md"
                disabled={currentNodeIndex === 0}
                aria-label="Nodo anterior"
              >
                <Icon name="skip-back" size={18} />
              </Button>
              <Button onclick={handleTogglePause} variant="secondary" size="md">
                <Icon name={status === 'paused' ? 'play' : 'pause'} size={18} />
              </Button>
              <Button
                onclick={ttsStore.nextNode}
                variant="ghost"
                size="md"
                disabled={currentNodeIndex >= nodesToRead.length - 1}
                aria-label="Siguiente nodo"
              >
                <Icon name="skip-forward" size={18} />
              </Button>
              <Button
                onclick={ttsStore.stopReading}
                variant="ghost"
                size="md"
                aria-label="Detener"
              >
                <Icon name="x-circle" size={18} />
              </Button>
            </div>
          </div>

          <div class="settings">
            <div class="setting-item">
              <label for="voice-select"><Icon name="mic" size={14} /> Voz</label
              >
              <select
                id="voice-select"
                class="ui-select"
                value={selectedVoiceId}
                onchange={onVoiceChange}
                disabled={availableVoices.length === 0}
              >
                {#each availableVoices as voice (voice.id)}
                  <option value={voice.id}>{voice.name}</option>
                {/each}
              </select>
            </div>
            <div class="setting-item">
              <label for="rate-slider">
                <Icon name="fast-forward" size={14} /> Velocidad ({rate.toFixed(
                  1
                )}x)
              </label>
              <input
                id="rate-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
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
    z-index: 100;
    width: 90%;
    max-width: 650px;
    border-radius: 12px;
    background-color: var(
      --color-background-translucent,
      rgba(255, 255, 255, 0.75)
    );
    backdrop-filter: blur(12px) saturate(150%);
    -webkit-backdrop-filter: blur(12px) saturate(150%);
    border: 1px solid var(--color-border, rgba(0, 0, 0, 0.08));
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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
    background-color: rgba(0, 0, 0, 0.05);
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
    color: var(--color-gray-500);
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
    color: var(--color-gray-500);
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
    border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.08));
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
    color: var(--color-gray-500);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ui-select {
    width: 100%;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-border);
    background-color: var(--color-background);
    color: var(--color-text);
  }
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: var(--color-gray-100);
    border-radius: 3px;
    outline: none;
    margin-top: auto;
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--color-accent);
    cursor: pointer;
    border-radius: 50%;
  }

  @media (prefers-color-scheme: dark) {
    .panel {
      background-color: rgba(30, 30, 30, 0.75);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .settings {
      border-top-color: rgba(255, 255, 255, 0.1);
    }
    .progress-container,
    .progress-indicator {
      background-color: rgba(255, 255, 255, 0.1);
    }
    .ui-select {
      background-color: var(--color-gray-100);
      border-color: rgba(255, 255, 255, 0.1);
    }
    input[type='range'] {
      background: rgba(255, 255, 255, 0.1);
    }
  }
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
