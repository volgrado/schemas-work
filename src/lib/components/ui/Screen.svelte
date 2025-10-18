<!--
  @component
  Screen

  This component acts as a standardized wrapper for major application views or "screens."
  Its primary role is to provide consistent layout and manage the enter/leave animations
  for the entire view, while orchestrating the animations of its child components.

  Key Features:
  - **Standardized Transitions**: Provides a default `fly` in and `fade` out transition for any view it wraps.
  - **Child Animation Orchestration**: It uses a slot prop `let:isExiting` to inform its children about its own animation state. When the screen begins its `outro` transition, it sets `isExiting` to `true`. Child components (like `OrganicCanvas`) can then bind to this state to synchronize their own exit animations.
  - **Self-Contained State**: The component manages its own `isExiting` state internally using Svelte's transition events (`on:outrostart` and `on:introend`). This makes it more robust and easier to use than passing the state down as a prop.
  - **Consistent Layout**: Ensures that all screens have a consistent root element and styling.

  Props:
  - `show`: {boolean} - Controls the visibility of the screen. When `false`, the screen will transition out and be removed from the DOM.

  Slot Props:
  - `isExiting`: {boolean} - A boolean that is `true` only when the screen is in the process of transitioning out. This is the key to synchronizing animations.
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
      delay: 250,
      easing: quintOut,
    }}
    out:fade={{ duration: 250 }}
    on:outrostart={() => (isExiting = true)}
    on:introend={() => (isExiting = false)}
  >
    <!--
      The `isExiting` state is exposed to the slot. Any component placed inside
      the Screen can access it using the `let:isExiting` directive.
    -->
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
