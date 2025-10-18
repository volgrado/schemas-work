<!--
  @component
  Popup

  A generic, unstyled popup component that can be positioned relative to a reference element.
  It uses `@floating-ui/dom` to calculate the optimal position, handling edge collisions
  and providing a flexible API for building tooltips, menus, or popovers.

  This component is designed to be a foundational UI primitive.

  Key Features:
  - Dynamic positioning using `@floating-ui/dom`.
  - Automatically flips and shifts to stay within the viewport.
  - Configurable placement and offset.
  - Can be anchored to either a physical DOM element (`referenceEl`) or a virtual
    element defined by a `DOMRect` (`getReferenceClientRect`).

  Props:
  - `isVisible`: {boolean} - Controls the visibility of the popup.
  - `placement`: {Placement} - The preferred placement (e.g., 'bottom-start'). Defaults to 'bottom-start'.
  - `referenceEl`: {HTMLElement | null} - A direct reference to the anchor DOM element. This is the simplest way to use the component.
  - `getReferenceClientRect`: {(() => DOMRect) | null} - A function that returns a `DOMRect`. Use this for virtual elements, like positioning relative to a text selection.
  - `offsetValue`: {number} - The distance in pixels to offset the popup from its reference. Defaults to 8.

  Usage:
  <!-- Method 1: Binding to a DOM element -->
  <button bind:this={buttonEl}>Reference</button>
  <Popup placement="bottom-start" isVisible={show} referenceEl={buttonEl}>
    Hello!
  </Popup>

  <!-- Method 2: Using a virtual element -->
  <Popup isVisible={show} getReferenceClientRect={() => myVirtualRect}>
    Hello from a virtual element!
  </Popup>
-->
<script lang="ts">
  import { computePosition, flip, shift, offset } from '@floating-ui/dom';
  import type { Placement, VirtualElement } from '@floating-ui/dom';

  // --- Props ---
  /** @prop {boolean} isVisible - Controls the visibility of the popup. */
  export let isVisible = false;
  /** @prop {Placement} placement - The preferred placement of the popup. */
  export let placement: Placement = 'bottom-start';
  /** @prop {HTMLElement | null} referenceEl - The anchor DOM element. */
  export let referenceEl: HTMLElement | null = null;
  /** @prop {(() => DOMRect) | null} getReferenceClientRect - A function returning a DOMRect for virtual elements. */
  export let getReferenceClientRect: (() => DOMRect) | null = null;
  /** @prop {number} offsetValue - The distance to offset the popup from its reference. */
  export let offsetValue: number = 8;

  let floatingEl: HTMLElement;
  let style = 'position: fixed; left: -9999px; top: -9999px; opacity: 0;'; // Start off-screen

  /**
   * Calculates and updates the popup's position using Floating UI.
   */
  async function updatePosition() {
    if (!floatingEl || (!referenceEl && !getReferenceClientRect)) return;

    const reference: VirtualElement | HTMLElement = referenceEl || {
      getBoundingClientRect: getReferenceClientRect!,
    };

    // Calculate the x and y coordinates.
    const { x, y } = await computePosition(reference, floatingEl, {
      placement,
      middleware: [offset(offsetValue), flip(), shift({ padding: 8 })],
    });

    style = `position: fixed; left: ${x}px; top: ${y}px; opacity: 1;`;
  }

  // Reactively update the position whenever visibility, placement, or the reference changes.
  $: if (isVisible && (referenceEl || getReferenceClientRect)) {
    updatePosition();
  } else {
    style = 'position: fixed; left: -9999px; top: -9999px; opacity: 0;';
  }
</script>

{#if isVisible}
  <div bind:this={floatingEl} {style} class="popup-container">
    <slot />
  </div>
{/if}

<style>
  .popup-container {
    z-index: 100;
    transition: opacity 0.1s ease-in-out;
  }
</style>
