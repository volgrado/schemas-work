<!-- src/lib/components/features/TTSController.svelte -->
<script lang="ts">
  // --- Svelte Core ---
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- Lógica de la Aplicación ---
  import { ttsStore } from '$lib/stores/ttsStore';

  // --- Componentes de UI ---
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { get } from 'svelte/store';

  const state = ttsStore;

  onMount(() => {
    // El `$state` en Svelte 5 ya no es un store, es el valor. Usamos get()
    // para leer el valor actual del store original sin suscribirnos.
    if (get(ttsStore).availableVoices.length === 0) {
      ttsStore.initialize();
    }
  });

  function handleTogglePause() {
    if ($state.status === 'paused') {
      ttsStore.resumeReading();
    } else if ($state.status === 'playing') {
      ttsStore.pauseReading();
    }
  }

  $: currentText =
    $state.status === 'playing' || $state.status === 'paused'
      ? $state.nodesToRead[$state.currentNodeIndex]?.text
      : '...';

  $: progress =
    $state.nodesToRead.length > 0
      ? (($state.currentNodeIndex + 1) / $state.nodesToRead.length) * 100
      : 0;
</script>

{#if $state.status !== 'idle'}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
    aria-live="polite"
  >
    <!-- 1. BARRA DE PROGRESO VISUAL -->
    {#if $state.status === 'playing' || $state.status === 'paused'}
      <div class="progress-container">
        <!-- ✅ CORRECCIÓN 2: Se usa la etiqueta de cierre explícita -->
        <div class="progress-bar" style="width: {progress}%"></div>
      </div>
    {/if}

    <div class="content-wrapper">
      <!-- 2. MANEJO DE ESTADOS: Loading, Error y Activo -->
      <!-- ✅ CORRECCIÓN 1: Se cambia 'loading' por 'initializing' -->
      {#if $state.status === 'initializing'}
        <div class="status-view">
          <!-- ✅ CORRECCIÓN 3: Se aplica `class` en lugar de `className` -->
          <Icon name="loader" size={20} class="spinner" />
          <span class="status-text">Inicializando audio...</span>
        </div>
      {:else if $state.status === 'error'}
        <div class="status-view error">
          <Icon name="alert-triangle" size={20} />
          <span class="status-text"
            >{$state.error || 'Ha ocurrido un error'}</span
          >
          <Button on:click={ttsStore.stopReading} variant="ghost" size="sm"
            >Cerrar</Button
          >
        </div>
      {:else if $state.status === 'playing' || $state.status === 'paused'}
        <!-- 3. VISTA PRINCIPAL DE CONTROL -->
        <div class="controls-view">
          <div class="main-controls">
            <p class="current-text" title={currentText}>{currentText}</p>
            <div class="actions">
              <Button
                on:click={handleTogglePause}
                variant="secondary"
                size="md"
              >
                <Icon
                  name={$state.status === 'paused' ? 'play' : 'pause'}
                  size={18}
                />
                <span>{$state.status === 'paused' ? 'Reanudar' : 'Pausa'}</span>
              </Button>
              <Button on:click={ttsStore.stopReading} variant="ghost" size="md">
                <Icon name="x-circle" size={18} />
                <span>Detener</span>
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
                bind:value={$state.selectedVoiceId}
                disabled={$state.availableVoices.length === 0}
              >
                {#each $state.availableVoices as voice (voice.id)}
                  <option value={voice.id}>{voice.name}</option>
                {/each}
              </select>
            </div>
            <div class="setting-item">
              <label for="rate-slider"
                ><Icon name="fast-forward" size={14} /> Velocidad</label
              >
              <input
                id="rate-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                bind:value={$state.rate}
              />
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* ... (Todo tu CSS se mantiene igual, ahora `.spinner` sí se usará) ... */
  .panel {
    position: fixed;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    width: 90%;
    max-width: 650px;
    border-radius: var(--radius-lg, 12px);
    background-color: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(12px) saturate(150%);
    -webkit-backdrop-filter: blur(12px) saturate(150%);
    border: 1px solid rgba(0, 0, 0, 0.08);
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
    background: var(--color-primary);
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-lg);
  }
  .current-text {
    flex-grow: 1;
    margin: 0;
    font-size: 1rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .actions {
    display: flex;
    gap: var(--space-sm);
    flex-shrink: 0;
  }
  .actions span {
    margin-left: var(--space-xs);
  }
  .settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
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
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background-color: var(--color-background);
  }
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: var(--color-gray-100);
    border-radius: 3px;
    outline: none;
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--color-primary);
    cursor: pointer;
    border-radius: 50%;
  }
  @media (prefers-color-scheme: dark) {
    .panel {
      background-color: rgba(30, 30, 30, 0.75);
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    }
    .settings {
      border-top-color: rgba(255, 255, 255, 0.1);
    }
    .progress-container {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
  @media (max-width: 640px) {
    .content-wrapper {
      padding: var(--space-md);
    }
    .main-controls {
      flex-direction: column;
      align-items: stretch;
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
