<script lang="ts">
  import { tick } from 'svelte';
  import { computePosition, flip, shift, offset } from '@floating-ui/dom';
  import type { Placement, VirtualElement } from '@floating-ui/dom';

  export let getReferenceClientRect: (() => DOMRect | null) | undefined =
    undefined;
  export let placement: Placement = 'bottom-start';
  export let isVisible = false;

  let floatingEl: HTMLElement;
  let style = 'position: absolute; left: 0; top: 0; opacity: 0;';

  async function updatePosition() {
    if (!floatingEl || !getReferenceClientRect) return;

    const rect = getReferenceClientRect();
    if (!rect) return; // Si no hay rectángulo, no hacemos nada

    const virtualEl: VirtualElement = { getBoundingClientRect: () => rect };

    await tick();

    const { x, y } = await computePosition(virtualEl, floatingEl, {
      placement,
      middleware: [offset(5), flip({ padding: 10 }), shift({ padding: 10 })],
    });

    style = `position: absolute; left: ${x}px; top: ${y}px; opacity: 1;`;
  }

  $: if (getReferenceClientRect && isVisible) {
    updatePosition();
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
