<!-- src/lib/components/ui/OrganicCanvas.svelte (SOLUCIÓN FINAL Y DEFINITIVA) -->
<script lang="ts">
  import { onMount } from 'svelte';

  // *** LA CORRECCIÓN FINAL ***
  // Declaramos que este componente ACEPTA una prop 'isExiting' de su padre.
  // Ahora la cadena de props (Animator -> Screen -> Canvas) está completa y es válida para TypeScript.
  export let isExiting = false;

  let paths: { d: string }[] = [];
  const NUM_LINES = 7;

  onMount(() => {
    const generatedPaths = [];
    for (let i = 0; i < NUM_LINES; i++) {
      generatedPaths.push({ d: generateWavyPath(i) });
    }
    paths = generatedPaths;
  });

  function generateWavyPath(index: number): string {
    const viewWidth = 1600;
    const amplitude = 50;
    const frequency = 4;
    const verticalOffset = 100 + index * 60;

    let d = `M -200 ${verticalOffset}`;

    for (let i = 0; i < frequency; i++) {
      const x1 = (i * viewWidth) / frequency + (Math.random() - 0.5) * 50;
      const y1 = verticalOffset - amplitude * (Math.random() * 0.5 + 0.5);
      const x2 =
        (i * viewWidth) / frequency +
        viewWidth / (frequency * 2) +
        (Math.random() - 0.5) * 50;
      const y2 = verticalOffset + amplitude * (Math.random() * 0.5 + 0.5);
      const endX = ((i + 1) * viewWidth) / frequency;
      const endY = verticalOffset;

      d += ` C ${x1},${y1} ${x2},${y2} ${endX},${endY}`;
    }
    return d;
  }
</script>

<!-- Aplicamos la clase 'exiting' cuando la prop sea true -->
<div class="canvas-container" class:exiting={isExiting} aria-hidden="true">
  <svg
    class="canvas-svg"
    preserveAspectRatio="xMidYMid slice"
    viewBox="0 0 1400 600"
  >
    {#each paths as path, i}
      <path class="adornment-path" style="--i: {i}" d={path.d} />
    {/each}
  </svg>
</div>

<style>
  .canvas-container {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    pointer-events: none;
  }

  .canvas-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .adornment-path {
    stroke: var(--color-gray-500);
    stroke-width: 1.5px;
    fill: none;
    opacity: 0.1;
    animation: drift 35s linear infinite alternate;
    animation-delay: calc(var(--i) * -5s);
  }

  @keyframes drift {
    from {
      transform: translateX(-5%);
    }
    to {
      transform: translateX(5%);
    }
  }

  /* Animación de salida controlada por la clase 'exiting' */
  .exiting .adornment-path {
    will-change: opacity, transform, stroke;
    animation: converge 1.2s ease-in-out forwards;
    animation-delay: calc(var(--i) * 0.02s);
    stroke: var(--color-accent);
  }

  @keyframes converge {
    100% {
      opacity: 0;
      transform: translateX(50vw) translateY(50vh) scale(0) rotate(2turn);
    }
  }
</style>
