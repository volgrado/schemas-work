<!--
  @component
  WelcomeAnimator

  @description
  An exceptional state machine for the welcome screen, orchestrating its appearance and
  disappearance. It uses Svelte's built-in transition events for robust, timer-free
  animation management, representing a best-practice pattern for lifecycle control.

  It listens for the start event from the WelcomeScreen, triggers a fade-out, and
  notifies its parent via the `oncomplete` callback precisely when the animation finishes.

  @props
  - `oncomplete`: {() => void} - Callback fired after the exit animation has completed.
-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import WelcomeScreen from './WelcomeScreen.svelte';

  // REFACTOR: Use a callback prop for events, the idiomatic Svelte 5 pattern.
  let { oncomplete } = $props<{ oncomplete: () => void }>();

  /**
   * The single source of truth for controlling the exit animation. When this becomes
   * true, the `out:fade` transition is triggered on the wrapper div.
   */
  let isExiting = $state(false);

  /**
   * Initiates the exit animation sequence by simply updating the state.
   */
  function handleStart() {
    isExiting = true;
  }
</script>

<!-- The `#if` block ensures the component and its transitions are removed from the DOM after exit. -->
{#if !isExiting}
  <div
    class="animator-wrapper"
    in:fade={{ duration: 300, delay: 300 }}
    out:fade={{ duration: 250 }}
    on:outroend={oncomplete}
  >
    <!-- REFACTOR: Use the modern `onstart` prop to handle the child's event. -->
    <WelcomeScreen onstart={handleStart} />
  </div>
{/if}
