<!-- src/lib/components/ui/HelpTooltip.svelte (VERSIÓN FINAL CON ESTILO TEMÁTICO) -->
<script lang="ts">
  import { tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { computePosition, flip, shift, offset } from '@floating-ui/dom';
  import Icon from './Icon.svelte';

  let referenceEl: HTMLElement;
  let floatingEl: HTMLElement;
  let isVisible = false;

  async function updatePosition() {
    if (!referenceEl || !floatingEl) return;
    const { x, y } = await computePosition(referenceEl, floatingEl, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 5 })],
    });
    Object.assign(floatingEl.style, {
      left: `${x}px`,
      top: `${y}px`,
    });
  }

  async function show() {
    isVisible = true;
    await tick();
    updatePosition();
  }

  function hide() {
    isVisible = false;
  }
</script>

<div
  class="tooltip-wrapper"
  bind:this={referenceEl}
  on:mouseenter={show}
  on:mouseleave={hide}
  on:focusin={show}
  on:focusout={hide}
  role="tooltip"
  aria-describedby="tooltip-content"
>
  <Icon name="help-circle" size={16} />
</div>

{#if isVisible}
  <div
    class="tooltip-text"
    bind:this={floatingEl}
    transition:fade={{ duration: 150 }}
    id="tooltip-content"
  >
    <slot />
  </div>
{/if}

<style>
  .tooltip-wrapper {
    display: flex;
    align-items: center;
    cursor: help;
    color: var(--color-gray-500);
  }

  /* --- *** ESTILOS TEMÁTICOS Y ROBUSTOS *** --- */

  .tooltip-text {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;

    /* Estilos por defecto (Modo Claro): fondo oscuro, texto claro. */
    background-color: var(--color-text);
    color: var(--color-background);

    border-radius: var(--space-sm);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: var(--space-sm) var(--space-md);

    font-size: 0.85rem;
    line-height: 1.5;
    width: max-content;
    max-width: 250px;
    text-align: center;
    white-space: normal;
  }

  /* Sobrescribimos para el Modo Oscuro */
  @media (prefers-color-scheme: dark) {
    .tooltip-text {
      /* Usamos un gris sólido que contrasta con el fondo */
      background-color: var(--color-gray-100);
      /* El texto será el color principal del tema (blanco) */
      color: var(--color-text);
      /* Un borde sutil para definir los límites */
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  }

  /* --- Estilos para el contenido del slot (ej. atajos) --- */
  /* Usamos :global() para que estos estilos afecten a los elementos
     que se pasan desde el AppHeader a través del <slot>. */

  :global(.tooltip-text .shortcuts) {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    text-align: left;
  }
  :global(.tooltip-text .shortcuts span) {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  :global(.tooltip-text kbd) {
    /* El estilo de las teclas ahora depende del tema del tooltip */
    background-color: var(--color-background);
    color: var(--color-text);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--color-gray-100);
    font-family: var(--font-main);
    font-size: 0.8rem;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  }
</style>
