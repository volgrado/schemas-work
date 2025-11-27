<!--
  @component
  WelcomeAnimator

  @description
  A state controller that wraps `WelcomeScreen`.
  It orchestrates the exit animation lifecycle, ensuring the parent component
  receives the `oncomplete` signal only after the visual transition has fully finished.

  @props
  - `oncomplete` (function): Callback fired when the exit animation finishes.
-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import WelcomeScreen from './WelcomeScreen.svelte';

  let { oncomplete } = $props<{ oncomplete: () => void }>();

  /**
   * Controls the visibility of the welcome screen.
   * Setting this to true triggers the `out:fade` transition.
   */
  let isExiting = $state(false);

  function handleStart() {
    isExiting = true;
  }
</script>

{#if !isExiting}
  <div
    class="animator-wrapper"
    in:fade={{ duration: 300, delay: 300 }}
    out:fade={{ duration: 250 }}
    onoutroend={oncomplete}
  >
    <WelcomeScreen onstart={handleStart} />
  </div>
{/if}
