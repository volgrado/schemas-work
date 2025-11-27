<!--
  @component
  Spinner

  @description
  A custom, brand-aligned loading indicator.
  Instead of a generic circle, it features three orbiting nodes representing
  the core concept of "schema building" or interconnected knowledge.

  @props
  - `size` ('sm' | 'md' | 'lg'): The size of the spinner. Defaults to 'md'.
-->
<script lang="ts">
  const { size = 'md' } = $props<{ size?: 'sm' | 'md' | 'lg' }>();
</script>

<div class="spinner spinner-{size}" role="status" aria-label="Loading">
  <div class="orbit">
    <!-- Three nodes arranged in a triangular "schema" pattern -->
    <div class="node node-1"></div>
    <div class="node node-2"></div>
    <div class="node node-3"></div>
  </div>
</div>

<style>
  /* Container Sizing */
  .spinner {
    position: relative;
    display: inline-block;
  }

  .spinner-sm {
    width: 16px;
    height: 16px;
  }
  .spinner-md {
    width: 24px;
    height: 24px;
  }
  .spinner-lg {
    width: 32px;
    height: 32px;
  }

  /* Main Rotation Animation */
  .orbit {
    width: 100%;
    height: 100%;
    position: relative;
    animation: orbitRotate 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  /* Node Styling */
  .node {
    position: absolute;
    border-radius: 50%;
    background: var(--color-accent);
    box-shadow: 0 0 8px var(--color-accent);
  }

  /* Node Sizes relative to container */
  .spinner-sm .node {
    width: 4px;
    height: 4px;
  }
  .spinner-md .node {
    width: 5px;
    height: 5px;
  }
  .spinner-lg .node {
    width: 6px;
    height: 6px;
  }

  /*
    Node Positioning & Pulse Animation
    Arranged in an equilateral triangle
  */
  .node-1 {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    animation: nodePulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .node-2 {
    bottom: 0;
    left: 15%;
    animation: nodePulse 2s cubic-bezier(0.4, 0, 0.2, 1) 0.33s infinite; /* Staggered delay */
  }

  .node-3 {
    bottom: 0;
    right: 15%;
    animation: nodePulse 2s cubic-bezier(0.4, 0, 0.2, 1) 0.66s infinite; /* Staggered delay */
  }

  @keyframes orbitRotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes nodePulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.3);
    }
  }

  /* Enhanced glow in dark mode */
  :global(.dark-theme) .node {
    box-shadow:
      0 0 10px var(--color-accent),
      0 0 20px rgba(var(--color-accent-rgb), 0.3);
  }
</style>
