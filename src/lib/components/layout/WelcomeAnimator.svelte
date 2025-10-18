<!--
  @component
  WelcomeAnimator

  This component orchestrates the animated transition from the WelcomeScreen to the main
  application interface. It acts as a state controller for the exit animation, ensuring
  that various visual effects are timed correctly and signaling completion to its parent.

  How it works:
  1. It wraps the `WelcomeScreen` component.
  2. When the user clicks the start button in `WelcomeScreen`, a `start` event is emitted.
  3. This component catches the `start` event and begins the exit sequence by setting `isExiting` to `true`.
  4. The `isExiting` flag adds a CSS class to the wrapper, which triggers a cascade of animations:
     - The `WelcomeScreen` itself fades out (handled by styles within that component).
     - A circular `unfurling-canvas` element rapidly expands from the center, creating a smooth background transition.
  5. After a set duration that matches the longest animation, it dispatches an `animationComplete` event, allowing the parent page to unmount the welcome view and display the main application.

  Events:
  - `animationComplete`: Dispatched when the exit animations are finished.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import WelcomeScreen from './WelcomeScreen.svelte';

  const dispatch = createEventDispatcher<{ animationComplete: void }>();

  /** @state {boolean} isExiting - The single source of truth for controlling the exit animation sequence. */
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
    }, 1500); // Duration should match the longest animation, in this case, the unfurling canvas.
  }
</script>

<div class="animator-wrapper" class:exiting={isExiting}>
  <!-- 
    Pass `isExiting` as a prop to WelcomeScreen. 
    This allows child components (like OrganicCanvas) to react and animate in cascade.
  -->
  <WelcomeScreen on:start={handleStart} {isExiting} />

  <!-- 
    This canvas element "unfurls" to create the background for the main editor view.
    Its animation is also triggered by the parent's '.exiting' class.
  -->
  <div class="unfurling-canvas"></div>
</div>

<style>
  .animator-wrapper {
    position: fixed;
    inset: 0;
    z-index: 200; /* High z-index to cover the main UI during animation */
    background-color: var(--color-background); /* Initial background matches the current theme */
    overflow: hidden; /* Essential to contain the expanding canvas */
  }

  /*
    This is the colored circle that "explodes" to become the new background.
  */
  .unfurling-canvas {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 2vw;
    height: 2vw;
    /* The color is set to the default background color of the destination screen. */
    background-color: var(--color-background-main, #ffffff);
    border-radius: 50%;
    /* Positioned behind the WelcomeScreen content for a cleaner effect. */
    z-index: -1;
    /* Starts invisible and scaled to zero. */
    transform: translate(-50%, -50%) scale(0);
  }

  /* --- Cascading CSS Animations --- */

  /* When the wrapper gets the '.exiting' class, this animation is triggered. */
  .exiting .unfurling-canvas {
    /* Advise the browser to prepare for transform animation for better performance. */
    will-change: transform;
    /* The animation runs after a delay, allowing other elements to start fading out first. */
    animation: unfurl 0.8s ease-in-out 0.7s forwards;
  }

  @keyframes unfurl {
    from {
      transform: translate(-50%, -50%) scale(0);
    }
    to {
      /* Grows to be enormous, covering the entire screen. */
      transform: translate(-50%, -50%) scale(100);
    }
  }

  /* Adapt the unfurling canvas color for dark mode. */
  @media (prefers-color-scheme: dark) {
    .unfurling-canvas {
      background-color: var(--color-background-main-dark, var(--color-background-dark));
    }
  }
</style>
