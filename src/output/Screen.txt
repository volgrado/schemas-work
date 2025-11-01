<!--
  @component
  Screen

  A top-level container for a major UI view (like the main editor or a welcome screen).
  It handles the mounting and unmounting of its content with a consistent set of
  enter and exit transitions.

  This component solves a common problem in Svelte where you might want to coordinate
  animations between a parent and a child. By exposing the `isExiting` state via a
  slot prop, child components can be made aware that their parent container is in the
  process of unmounting, allowing them to play their own exit animations simultaneously.

  Props:
  - `show`: {boolean} - Controls the visibility of the screen.

  Slots:
  - `default`: The content of the screen.
    - `isExiting`: {boolean} - A boolean that is `true` when the screen is playing its exit animation.
-->
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
