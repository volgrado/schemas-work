<!--
  @component
  TTSController.svelte

  Este componente es la interfaz de usuario para el modo de Lectura en Voz Alta.
  Aparece cuando el `ttsStore` está en estado 'isPlaying'.

  Responsabilidades:
  - Mostrar el estado actual (Pausa/Reanudar).
  - Permitir al usuario pausar, reanudar y detener la lectura.
  - Es una "vista" pura: toda la lógica de la síntesis de voz
    y el manejo del estado reside en `ttsStore.ts`.
-->
<script lang="ts">
  // --- Svelte Core ---
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- Lógica de la Aplicación ---
  import { ttsStore } from '$lib/stores/ttsStore';

  // --- Componentes de UI ---
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // Creamos una referencia reactiva al estado del store.
  const state = ttsStore;

  /**
   * Decide si pausar o reanudar la lectura basándose en el estado actual.
   */
  function handleTogglePause() {
    if ($state.isPaused) {
      ttsStore.resumeReading();
    } else {
      ttsStore.pauseReading();
    }
  }
</script>

{#if $state.isPlaying}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
  >
    <!-- Botón dinámico que cambia de icono y texto según el estado de pausa -->
    <Button on:click={handleTogglePause} variant="secondary" size="md">
      <Icon name={$state.isPaused ? 'play' : 'pause'} size={18} />
      <span class="button-text">{$state.isPaused ? 'Reanudar' : 'Pausa'}</span>
    </Button>

    <!-- Botón para detener y salir del modo de lectura -->
    <Button on:click={ttsStore.stopReading} variant="ghost" size="md">
      <Icon name="x-circle" size={18} />
      <span class="button-text">Detener</span>
    </Button>
  </div>
{/if}

<style>
  .panel {
    position: fixed;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;

    display: flex;
    align-items: center;
    gap: var(--space-md);

    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-lg, 12px);
    background-color: var(--color-background);
    border: 1px solid var(--color-border, var(--color-gray-100));
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.05),
      0 8px 24px rgba(0, 0, 0, 0.12);

    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .button-text {
    margin-left: var(--space-xs);
    font-size: 0.95rem;
    font-weight: 500;
  }

  /* === Modo oscuro === */
  @media (prefers-color-scheme: dark) {
    .panel {
      background-color: rgba(30, 30, 30, 0.85);
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.25),
        0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .button-text {
      color: rgba(255, 255, 255, 0.95);
    }
  }

  /* === Responsive Touch-Friendly Padding === */
  @media (max-width: 640px) {
    .panel {
      bottom: var(--space-md);
      padding: var(--space-sm);
      gap: var(--space-sm);
      border-radius: var(--radius-md, 8px);
    }

    .button-text {
      font-size: 0.9rem;
    }
  }
</style>
