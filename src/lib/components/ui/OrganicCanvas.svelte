<!--
  @component
  OrganicCanvas

  This component renders an SVG canvas with a series of animated, wavy paths to create a
  dynamic and organic-feeling background effect. The animation is designed to be subtle
  and visually pleasing, adding a touch of life to the UI.

  It is synchronized with page transitions through an `isExiting` prop, which ensures
  a smooth fade-out animation when navigating away from the screen it's on.

  Key Features:
  - Generates multiple wavy SVG paths for a layered effect.
  - Uses CSS animations for both a horizontal "flow" and a vertical "wave" motion.
  - Animation delays are staggered for each line, creating a more natural, asynchronous feel.
  - Optimized for performance by using CSS transforms and opacity.
  - Responds to the `isExiting` prop to trigger a fade-out transition, coordinating with page navigation.

  Props:
  - `isExiting`: {boolean} - A boolean flag passed down from a parent animator component. When `true`, it signals that the component should play its exit animation. This is crucial for seamless page transitions.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * @prop {boolean} isExiting - A boolean flag that signals when the component should play its exit animation.
   * This prop chain (Animator -> Screen -> Canvas) is compatible with TypeScript and Svelte's reactivity model.
   */
  export let isExiting: boolean = false;

  let paths: { d: string }[] = [];
  const NUM_LINES = 7;

  onMount(() => {
    // Generate the paths once the component is mounted to the DOM.
    const generatedPaths = [];
    for (let i = 0; i < NUM_LINES; i++) {
      generatedPaths.push({ d: generateWavyPath(i) });
    }
    paths = generatedPaths;
  });

  /**
   * Generates the SVG path data (`d` attribute) for a single wavy line.
   * @param {number} index - The index of the line, used to calculate its vertical offset.
   * @returns {string} The SVG path data string.
   */
  function generateWavyPath(index: number): string {
    const viewWidth = 1600; // The virtual width of the SVG canvas.
    const amplitude = 50; // The height of the waves.
    const frequency = 4; // The number of wave crests across the view.
    const verticalOffset = 100 + index * 60; // Vertical spacing for each line.

    let d = `M -200 ${verticalOffset}`; // Start the path off-screen to the left.

    // Create a series of cubic Bézier curves to form the wavy line.
    for (let i = 0; i < frequency; i++) {
      const x1 = (i * viewWidth) / frequency;
      const x2 = ((i + 0.5) * viewWidth) / frequency;
      const x3 = ((i + 1) * viewWidth) / frequency;

      const y1 = verticalOffset;
      const y2 = verticalOffset + (i % 2 === 0 ? -amplitude : amplitude);
      const y3 = verticalOffset;

      d += ` C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
    }

    return d;
  }
</script>

<div class="canvas-container" class:is-exiting={isExiting}>
  <svg
    class="organic-canvas"
    viewBox="0 0 1400 600"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <g class="lines-group">
      {#each paths as path, i}
        <path
          class="line"
          d={path.d}
          style:--index={i}
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
        />
      {/each}
    </g>
  </svg>
</div>

<style>
  .canvas-container {
    position: fixed;
    inset: 0;
    z-index: -1; /* Place the canvas behind all other content. */
    opacity: 1;
    transition: opacity 0.5s ease-in-out;
  }

  .organic-canvas {
    width: 100%;
    height: 100%;
  }

  .lines-group {
    animation: flow 20s linear infinite;
  }

  .line {
    stroke: var(--color-primary-accent-light);
    animation: wave 5s ease-in-out infinite alternate;
    animation-delay: calc(
      var(--index) * 0.2s
    ); /* Staggered delay for each line */
    transform-origin: 50% 50%;
  }

  /* Exit animation: fades out the container when the `isExiting` prop is true. */
  .canvas-container.is-exiting {
    opacity: 0;
  }

  @keyframes flow {
    from {
      transform: translateX(-10%);
    }
    to {
      transform: translateX(10%);
    }
  }

  @keyframes wave {
    from {
      transform: scaleY(0.8) translateY(10px);
    }
    to {
      transform: scaleY(1.2) translateY(-10px);
    }
  }

  /* --- Dark Mode Styles --- */
  @media (prefers-color-scheme: dark) {
    .line {
      stroke: var(--color-primary-accent-dark);
    }
  }
</style>
