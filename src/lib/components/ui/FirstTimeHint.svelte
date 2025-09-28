<!--
  @component
  FirstTimeHint.svelte

  Este es un componente de "micro-onboarding" que se muestra una sola vez
  al usuario para enseñarle el atajo de teclado de la CommandBar (Ctrl+K).

  Está diseñado para ser informativo pero no intrusivo, y fácil de descartar.

  @event close - Se dispara cuando el usuario hace clic en el botón de cerrar.
-->
<script lang="ts">
  // --- Svelte Core ---
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  // --- Componentes de UI ---
  import Icon from './Icon.svelte';

  const dispatch = createEventDispatcher();

  /**
   * Notifica al componente padre que este hint debe ser cerrado.
   */
  function handleClose() {
    dispatch('close');
  }
</script>

<div class="hint-container" in:fly={{ y: 20, duration: 300 }} out:fade>
  <p class="hint-text">
    <span>Presiona</span>
    <!-- La etiqueta <kbd> es semánticamente correcta para atajos de teclado -->
    <kbd>Ctrl</kbd>
    <span>+</span>
    <kbd>K</kbd>
    <span>para abrir el menú de comandos.</span>
  </p>
  <button class="close-button" on:click={handleClose} aria-label="Cerrar pista">
    <Icon name="x" size={18} />
  </button>
</div>

<style>
  .hint-container {
    position: fixed;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: 90; /* Por encima del editor, pero debajo de otros paneles */

    display: flex;
    align-items: center;
    gap: var(--space-md);

    background-color: var(--color-text);
    color: var(--color-background);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--space-sm);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .hint-text {
    margin: 0;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    white-space: nowrap; /* Evita que el texto se rompa en varias líneas */
  }

  kbd {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-family: var(--font-main);
    font-size: 0.85rem;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-background);
    opacity: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-xs);
    border-radius: 50%;
    transition:
      opacity 0.2s,
      background-color 0.2s;
  }

  .close-button:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.1);
  }
</style>
