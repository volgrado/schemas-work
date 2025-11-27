<script lang="ts">
  /**
   * Spinner - schemas.work branded loading animation
   * Unique design: Three orbiting nodes representing schema building
   */
  let { size = 'md' } = $props<{ size?: 'sm' | 'md' | 'lg' }>();
</script>

<div class="spinner spinner-{size}" role="status" aria-label="Loading">
  <div class="orbit">
    <div class="node node-1"></div>
    <div class="node node-2"></div>
    <div class="node node-3"></div>
  </div>
</div>

<style>
  /* Container */
  .spinner {
    position: relative;
    display: inline-block;
  }
  
  .spinner-sm { width: 16px; height: 16px; }
  .spinner-md { width: 24px; height: 24px; }
  .spinner-lg { width: 32px; height: 32px; }

  /* Orbital ring */
  .orbit {
    width: 100%;
    height: 100%;
    position: relative;
    animation: orbitRotate 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  /* Individual nodes - representing schema building blocks */
  .node {
    position: absolute;
    border-radius: 50%;
    background: var(--color-accent);
    box-shadow: 0 0 8px var(--color-accent);
  }

  /* Size variants for nodes */
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

  /* Position nodes in a triangular schema pattern */
  .node-1 {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    animation: nodePulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .node-2 {
    bottom: 0;
    left: 15%;
    animation: nodePulse 2s cubic-bezier(0.4, 0, 0.2, 1) 0.33s infinite;
  }

  .node-3 {
    bottom: 0;
    right: 15%;
    animation: nodePulse 2s cubic-bezier(0.4, 0, 0.2, 1) 0.66s infinite;
  }

  /* Smooth rotation of the entire structure */
  @keyframes orbitRotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Pulsing nodes with glow effect */
  @keyframes nodePulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.3);
    }
  }

  /* Theme support - subtle variation in dark mode */
  :global(.dark-theme) .node {
    box-shadow: 
      0 0 10px var(--color-accent),
      0 0 20px rgba(var(--color-accent-rgb), 0.3);
  }
</style>
