<!--
  @component
  WelcomeAnimator

  This component acts as a state machine and transition manager for the welcome screen.
  It controls the mounting and unmounting of the `WelcomeScreen` component, orchestrating
  the fade-in and fade-out animations.

  Its primary responsibility is to listen for the `start` event from the `WelcomeScreen`
  and then manage a timed exit sequence, finally notifying its parent via the `animationComplete`
  event that the welcome process is finished.

  Events:
  - `animationComplete`: Fired after the exit animation has completed.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import WelcomeScreen from './WelcomeScreen.svelte';
  import { fade } from 'svelte/transition';

  const dispatch = createEventDispatcher<{ animationComplete: void }>();
  /** @state {boolean} isExiting - The single source of truth for controlling the exit animation sequence.
   */
  let isExiting = false;

  /**
   * Initiates the exit animation sequence.
   * This function is triggered by the `start` event from the `WelcomeScreen`.
   */
  function handleStart() {
    // 1. Activate the exiting state, adding the '.exiting' class to the wrapper.
    isExiting = true;

    // 2. Set a timer that matches the total duration of the CSS animations.
    //    When it completes, notify the parent page that the transition is finished.
    setTimeout(() => {
      dispatch('animationComplete');
    }, 250); // Duration should match the out:fade animation.
  }
</script>

{#if !isExiting}
  <div
    class="animator-wrapper"
    in:fade={{ duration: 300, delay: 300 }}
    out:fade={{ duration: 250 }}
  >
    <WelcomeScreen on:start={handleStart} />
  </div>
{/if}

<style>
  .animator-wrapper {
    position: fixed;
    inset: 0;
    z-index: 200; /* High z-index to cover the main UI during animation */
  }
</style>
