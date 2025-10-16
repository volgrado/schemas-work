<!-- src/lib/components/ui/HelpTooltip.svelte (VERSIÓN CORREGIDA Y FINAL) -->
<script lang="ts">
  import { tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import {
    computePosition,
    flip,
    shift,
    offset,
    arrow,
  } from '@floating-ui/dom';
  import type { Coords } from '@floating-ui/dom'; // Importamos el tipo Coords
  import Icon from './Icon.svelte';

  let referenceEl: HTMLElement;
  let floatingEl: HTMLElement;
  let arrowEl: HTMLElement;
  let isVisible = false;

  async function updatePosition() {
    // FIX: Añadimos arrowEl a la comprobación inicial para mayor seguridad
    if (!referenceEl || !floatingEl || !arrowEl) return;

    const { x, y, middlewareData, placement } = await computePosition(
      referenceEl,
      floatingEl,
      {
        placement: 'top',
        middleware: [
          offset(10),
          flip(),
          shift({ padding: 8 }),
          arrow({ element: arrowEl }),
        ],
      }
    );

    Object.assign(floatingEl.style, {
      left: `${x}px`,
      top: `${y}px`,
    });

    // FIX: Comprobamos que middlewareData.arrow existe antes de usarlo
    if (middlewareData.arrow) {
      const { x: arrowX, y: arrowY } = middlewareData.arrow;

      const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right',
      }[placement.split('-')[0]];

      // FIX: Comprobamos que staticSide es una cadena válida antes de usarla como clave
      if (staticSide) {
        Object.assign(arrowEl.style, {
          left: arrowX != null ? `${arrowX}px` : '',
          top: arrowY != null ? `${arrowY}px` : '',
          right: '',
          bottom: '',
          // Ahora esta línea es segura
          [staticSide]: '-4px',
        });
      }
    }
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

<button
  class="tooltip-trigger"
  aria-label="Mostrar ayuda"
  bind:this={referenceEl}
  on:mouseenter={show}
  on:mouseleave={hide}
  on:focusin={show}
  on:focusout={hide}
>
  <Icon name="help-circle" size={16} />
</button>

{#if isVisible}
  <div
    class="tooltip-content"
    role="tooltip"
    bind:this={floatingEl}
    transition:fade={{ duration: 150 }}
  >
    <div class="tooltip-arrow" bind:this={arrowEl}></div>
    <slot />
  </div>
{/if}

<style>
  /* El CSS no necesita cambios, se mantiene igual que en la versión anterior */
  .tooltip-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: help;
    padding: 4px;
    border-radius: 50%;
    color: var(--theme-text-secondary, #94969a);
    transition:
      color 0.2s,
      background-color 0.2s;
  }
  .tooltip-trigger:hover,
  .tooltip-trigger:focus-visible {
    outline: none;
    color: var(--theme-text-primary, #e0e2e5);
    background-color: var(--theme-bg-tertiary, #35363b);
  }
  .tooltip-content {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 120;
    background-color: var(--theme-bg-secondary, #2b2c31);
    color: var(--theme-text-primary, #e0e2e5);
    border: 1px solid var(--theme-border, #3c3d42);
    box-shadow: var(--shadow-menu, 0 5px 15px rgba(0, 0, 0, 0.3));
    border-radius: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    font-size: 0.85rem;
    line-height: 1.5;
    width: max-content;
    max-width: 250px;
    text-align: left;
    white-space: normal;
  }
  .tooltip-arrow {
    position: absolute;
    background: var(--theme-bg-secondary, #2b2c31);
    border-right: 1px solid var(--theme-border, #3c3d42);
    border-bottom: 1px solid var(--theme-border, #3c3d42);
    width: 8px;
    height: 8px;
    transform: rotate(45deg);
  }
  :global(.tooltip-content kbd) {
    background-color: var(--theme-bg-tertiary, #35363b);
    color: var(--theme-text-primary, #e0e2e5);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--theme-border, #3c3d42);
    font-family: inherit;
    font-size: 0.8rem;
  }
</style>
