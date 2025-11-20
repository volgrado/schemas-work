<!-- src/lib/components/ui/HelpTooltip.svelte -->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Placement } from '@floating-ui/dom';
  import {
    computePosition,
    flip,
    shift,
    offset,
    arrow,
    autoUpdate,
  } from '@floating-ui/dom';
  import Icon from './Icon.svelte';
  import { t } from '$lib/utils/i18n';

  let { placement = 'top' as Placement, children } = $props<{
    placement?: Placement;
    children: any;
  }>();

  let isVisible = $state(false);
  let referenceEl = $state<HTMLElement | null>(null);
  let floatingEl = $state<HTMLElement | null>(null);
  let arrowEl = $state<HTMLElement | null>(null);

  let floatingStyle = $state('');
  let arrowStyle = $state('');
  let finalPlacement = $state(placement);

  $effect(() => {
    if (isVisible && referenceEl && floatingEl && arrowEl) {
      const update = async () => {
        // FIX: Use non-null assertions `!` as we have already checked for null.
        const {
          x,
          y,
          middlewareData,
          placement: nextPlacement,
        } = await computePosition(referenceEl!, floatingEl!, {
          placement,
          middleware: [
            offset(10),
            flip(),
            shift({ padding: 8 }),
            arrow({ element: arrowEl! }),
          ],
        });

        floatingStyle = `left: ${x}px; top: ${y}px;`;
        finalPlacement = nextPlacement;

        if (middlewareData.arrow) {
          const { x: arrowX, y: arrowY } = middlewareData.arrow;
          arrowStyle = `left: ${arrowX ?? ''}px; top: ${arrowY ?? ''}px;`;
        }
      };

      // FIX: Use non-null assertion `!` for the autoUpdate function as well.
      const cleanup = autoUpdate(referenceEl!, floatingEl!, update);

      return cleanup;
    }
  });
</script>

<button
  class="tooltip-trigger"
  aria-label={$t('tooltip.show_help')}
  bind:this={referenceEl}
  onmouseenter={() => (isVisible = true)}
  onmouseleave={() => (isVisible = false)}
  onfocus={() => (isVisible = true)}
  onblur={() => (isVisible = false)}
>
  <Icon name="help-circle" size={16} />
</button>

{#if isVisible}
  <div
    class="tooltip-content"
    role="tooltip"
    bind:this={floatingEl}
    style={floatingStyle}
    data-placement={finalPlacement}
    transition:fade={{ duration: 150 }}
  >
    <div class="tooltip-arrow" bind:this={arrowEl} style={arrowStyle}></div>
    {@render children?.()}
  </div>
{/if}

<style>
  /* Styles remain the same */
  .tooltip-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: help;
    padding: 4px;
    border-radius: 50%;
    color: var(--color-gray-500);
    transition:
      color 0.2s,
      background-color 0.2s;
  }
  .tooltip-trigger:hover,
  .tooltip-trigger:focus-visible {
    outline: none;
    color: var(--color-text);
    background-color: var(--color-gray-100);
  }
  .tooltip-content {
    position: fixed;
    z-index: var(--z-tooltip);
    background-color: var(--color-background-raised);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-lg);
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-md);
    font-size: var(--font-size-sm);
    line-height: 1.5;
    width: max-content;
    max-width: 280px;
    text-align: left;
    white-space: normal;
  }
  .tooltip-arrow {
    position: absolute;
    background: var(--color-background-raised);
    border: 1px solid var(--color-border);
    width: 8px;
    height: 8px;
  }
  [data-placement^='top'] > .tooltip-arrow {
    bottom: -5px;
    border-top-color: transparent;
    border-left-color: transparent;
    transform: rotate(45deg);
  }
  [data-placement^='bottom'] > .tooltip-arrow {
    top: -5px;
    border-bottom-color: transparent;
    border-right-color: transparent;
    transform: rotate(45deg);
  }
  [data-placement^='left'] > .tooltip-arrow {
    right: -5px;
    border-bottom-color: transparent;
    border-left-color: transparent;
    transform: rotate(45deg);
  }
  [data-placement^='right'] > .tooltip-arrow {
    left: -5px;
    border-top-color: transparent;
    border-right-color: transparent;
    transform: rotate(45deg);
  }
</style>
