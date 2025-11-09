<!--
  @component
  Popup

  An exceptional, unstyled popup component that serves as a robust UI primitive for tooltips,
  menus, and popovers. It uses `@floating-ui/dom` with `autoUpdate` to ensure the popup
  always stays anchored to its reference element during scroll, resize, and other layout shifts.
-->
<script lang="ts">
  import {
    computePosition,
    flip,
    shift,
    offset,
    autoUpdate,
  } from '@floating-ui/dom';
  import type { Placement, VirtualElement } from '@floating-ui/dom';
  import { quintOut } from 'svelte/easing';
  import type { Snippet } from 'svelte';
  // FIX 1: Import `TransitionConfig` from the correct 'svelte/transition' module.
  import type { TransitionConfig } from 'svelte/transition';

  // --- Props Definition (Svelte 5 Runes) ---
  let {
    isVisible = $bindable(false),
    placement = 'bottom-start' as Placement,
    referenceEl = null as HTMLElement | null,
    getReferenceClientRect = null as (() => DOMRect) | null,
    offsetValue = 8,
    children,
  } = $props<{
    isVisible: boolean;
    placement?: Placement;
    referenceEl?: HTMLElement | null;
    getReferenceClientRect?: (() => DOMRect) | null;
    offsetValue?: number;
    children: Snippet;
  }>();

  let floatingEl = $state<HTMLElement | null>(null);
  let x = $state(0);
  let y = $state(0);

  // This reactive effect handles the positioning logic.
  $effect(() => {
    if (isVisible && floatingEl && (referenceEl || getReferenceClientRect)) {
      const reference: VirtualElement | HTMLElement = referenceEl || {
        getBoundingClientRect: getReferenceClientRect!,
      };

      const cleanup = autoUpdate(reference, floatingEl, () => {
        computePosition(reference, floatingEl!, {
          placement,
          middleware: [offset(offsetValue), flip(), shift({ padding: 8 })],
        }).then(({ x: newX, y: newY }) => {
          x = newX;
          y = newY;
        });
      });

      return cleanup;
    }
  });

  const fadeScale = (
    node: Element,
    { duration = 150, easing = quintOut, start = 0.95 } = {}
  ): TransitionConfig => {
    return {
      duration,
      easing,
      // FIX 2: Add the explicit `number` type to the `t` parameter.
      css: (t: number) => `
        opacity: ${t};
        transform: scale(${start + (1 - start) * t});
      `,
    };
  };
</script>

{#if isVisible}
  <div
    bind:this={floatingEl}
    style="position: fixed; left: {x}px; top: {y}px;"
    class="popup-container"
    transition:fadeScale
  >
    {@render children?.()}
  </div>
{/if}

<style>
  .popup-container {
    z-index: var(--z-context-menu);
    transform-origin: top left;
  }
</style>
