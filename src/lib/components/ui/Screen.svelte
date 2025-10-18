<script lang="ts">
  import { quintOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';

  /**
   * @prop {boolean} [show=false] - Controls the visibility of the screen.
   */
  export let show: boolean = false;

  // This internal state tracks whether the component is currently playing its exit animation.
  let isExiting = false;
</script>

{#if show}
  <div
    class="screen-container"
    in:fly={{
      y: 20,
      duration: 500,
      easing: quintOut,
    }}
    out:fade={{ duration: 250 }}
    on:outrostart={() => (isExiting = true)}
    on:introend={() => (isExiting = false)}
  >
    <slot {isExiting} />
  </div>
{/if}

<style>
  .screen-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }
</style>
