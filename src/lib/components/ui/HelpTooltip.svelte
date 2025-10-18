<!--
  @component
  HelpTooltip

  This component provides a small help icon button that reveals a tooltip with
  more information on hover or focus. The tooltip's content is flexible and is
  passed in via the default slot.

  It uses the `@floating-ui/dom` library to intelligently position the tooltip,
  ensuring it remains visible within the viewport by flipping it to the opposite
  side if necessary. It also includes an arrow that points to the trigger element.

  Features:
  - Triggered by mouse enter/leave and focus in/out events.
  - Dynamic positioning using `@floating-ui/dom`.
  - Includes middleware for `offset`, `flip`, `shift`, and `arrow`.
  - Graceful fade transition for visibility.
  - The tooltip content is fully customizable via a slot.

  Slots:
  - `default`: The content to be displayed inside the tooltip.
-->
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
  import Icon from './Icon.svelte';
  import { t } from '$lib/utils/i18n';

  // DOM element references for positioning
  let referenceEl: HTMLElement; // The trigger button
  let floatingEl: HTMLElement; // The tooltip container
  let arrowEl: HTMLElement; // The small arrow element

  /** @state {boolean} isVisible - Controls the visibility of the tooltip. */
  let isVisible = false;

  /**
   * Calculates and applies the optimal position for the tooltip using Floating UI.
   */
  async function updatePosition() {
    // Ensure all required elements are available before calculating position.
    if (!referenceEl || !floatingEl || !arrowEl) return;

    const { x, y, middlewareData, placement } = await computePosition(
      referenceEl,
      floatingEl,
      {
        placement: 'top', // Preferred placement
        middleware: [
          offset(10), // Distance between tooltip and trigger
          flip(), // Flip to the opposite side if it overflows
          shift({ padding: 8 }), // Shift along the axis to prevent overflow
          arrow({ element: arrowEl }), // Add the arrow pointing to the trigger
        ],
      }
    );

    // Apply the calculated coordinates to the floating element.
    Object.assign(floatingEl.style, {
      left: `${x}px`,
      top: `${y}px`,
    });

    // Position the arrow correctly.
    if (middlewareData.arrow) {
      const { x: arrowX, y: arrowY } = middlewareData.arrow;

      const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right',
      }[placement.split('-')[0]];

      if (staticSide) {
        Object.assign(arrowEl.style, {
          left: arrowX != null ? `${arrowX}px` : '',
          top: arrowY != null ? `${arrowY}px` : '',
          right: '',
          bottom: '',
          [staticSide]: '-4px', // Position the arrow just outside the tooltip body
        });
      }
    }
  }

  /**
   * Shows the tooltip and updates its position.
   */
  async function show() {
    isVisible = true;
    // Wait for the next DOM update cycle for the element to be in the DOM
    await tick();
    updatePosition();
  }

  /**
   * Hides the tooltip.
   */
  function hide() {
    isVisible = false;
  }
</script>

<!-- The trigger element that the user interacts with. -->
<button
  class="tooltip-trigger"
  aria-label={t('tooltip.show_help')}
  bind:this={referenceEl}
  on:mouseenter={show}
  on:mouseleave={hide}
  on:focusin={show}
  on:focusout={hide}
>
  <Icon name="help-circle" size={16} />
</button>

<!-- The tooltip itself, rendered conditionally. -->
{#if isVisible}
  <div
    class="tooltip-content"
    role="tooltip"
    bind:this={floatingEl}
    transition:fade={{ duration: 150 }}
  >
    <!-- The small arrow pointing to the trigger element. -->
    <div class="tooltip-arrow" bind:this={arrowEl}></div>
    <slot />
  </div>
{/if}

<style>
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
    top: 0;
    left: 0;
    z-index: 120;
    background-color: var(--color-background-elevated, #ffffff);
    color: var(--color-text);
    border: 1px solid var(--color-border, #e0e0e0);
    box-shadow: var(--shadow-lg);
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
    background: var(--color-background-elevated, #ffffff);
    border-right: 1px solid var(--color-border, #e0e0e0);
    border-bottom: 1px solid var(--color-border, #e0e0e0);
    width: 8px;
    height: 8px;
    transform: rotate(45deg);
  }
  
  /* Dark mode styles */
  @media (prefers-color-scheme: dark) {
    .tooltip-trigger:hover,
    .tooltip-trigger:focus-visible {
      background-color: var(--color-gray-800);
    }
    .tooltip-content {
      background-color: var(--color-gray-900);
      border-color: var(--color-gray-700);
    }
    .tooltip-arrow {
      background: var(--color-gray-900);
      border-right: 1px solid var(--color-gray-700);
      border-bottom: 1px solid var(--color-gray-700);
    }
  }
</style>
