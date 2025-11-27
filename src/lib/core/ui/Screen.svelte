<!--
  @component
  Screen

  An exceptional top-level container for a major UI view. It orchestrates a sophisticated,
  unified transition for mounting and unmounting its content.

  It solves the complex challenge of coordinating animations by exposing an `isExiting`
  slot prop. Child components can use this state to play their own exit animations in perfect
  sync with the parent screen's outro, creating seamless, app-like page transitions.

  Props:
  - `show`: {boolean} - Controls the visibility of the screen.

  Slots:
  - `default`: The content of the screen.
    - `isExiting`: {boolean} - A boolean that is `true` only when the screen is playing its exit animation.
-->
<script lang="ts">
  import { quintOut } from 'svelte/easing';
  import type { TransitionConfig } from 'svelte/transition';

  type ScreenTransitionParams = {
    duration?: number;
    easing?: (t: number) => number;
    y?: number;
    start?: number;
  };

  const {
    /**
     * @prop {boolean} [show=false] - Controls the visibility of the screen.
     */
    show = false,
    children,
  } = $props<{
    show?: boolean;
    children?: import('svelte').Snippet<[boolean]>;
  }>();

  let isExiting = $state(false);

  /**
   * A custom transition for a more premium, modern feel.
   * It combines a vertical fly with a subtle scale, fade, and blur.
   */
  const screenTransition = (
    node: Element,
    {
      duration = 600,
      easing = quintOut,
      y = 15,
      start = 0.98,
    }: ScreenTransitionParams
  ): TransitionConfig => {
    return {
      duration,
      easing,
      css: (t: number, u: number) => {
        const eased = easing(t);
        return `
          opacity: ${eased};
          transform: scale(${start + (1 - start) * eased}) translateY(${y * u}px);
          filter: blur(${u * 4}px);
        `;
      },
    };
  };
</script>

{#if show}
  <div
    class="screen-container"
    transition:screenTransition={{}}
    onoutrostart={() => (isExiting = true)}
    onintroend={() => (isExiting = false)}
  >
    {@render children?.(isExiting)}
  </div>
{/if}

<style>
  .screen-container {
    width: 100%;
    height: 100%;
    contain: layout style;
    position: relative;
  }
</style>
