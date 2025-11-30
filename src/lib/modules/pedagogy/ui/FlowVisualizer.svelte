<!--
  @component
  FlowVisualizer
  
  Visualizes the learner's position in the Flow Channel (Challenge vs Skill) using SVG.
-->
<script lang="ts">
  import { fade } from 'svelte/transition';

  let { 
    challenge = 0.5,
    skill = 0.5
  } = $props<{ 
    challenge: number;
    skill: number;
  }>();

  // Coordinates
  // x: 0-400 (Skill)
  // y: 0-100 (Challenge, inverted)
  let x = $derived(skill * 400);
  let y = $derived((1 - challenge) * 100);

  // Determine zone text
  let zone = $derived.by(() => {
    const diff = challenge - skill;
    if (Math.abs(diff) < 0.15) return 'Flow';
    if (diff > 0) return 'Anxiety';
    return 'Boredom';
  });
</script>

<div class="flow-graph">
  <div class="graph-container">
    <!-- Axes Labels -->
    <span class="axis-label y-axis">Challenge</span>
    <span class="axis-label x-axis">Skill</span>

    <!-- SVG with 4:1 Aspect Ratio (400x100) -->
    <svg viewBox="0 0 400 100" class="graph-svg">
      <defs>
        <linearGradient id="anxietyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color: #ef4444; stop-opacity: 0.2" />
          <stop offset="50%" style="stop-color: #ef4444; stop-opacity: 0" />
        </linearGradient>
        <linearGradient id="boredomGradient" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color: #3b82f6; stop-opacity: 0.2" />
          <stop offset="50%" style="stop-color: #3b82f6; stop-opacity: 0" />
        </linearGradient>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--color-border)" stroke-width="0.5" />
        </pattern>
      </defs>

      <!-- Grid Background -->
      <rect width="400" height="100" fill="url(#grid)" opacity="0.3" />

      <!-- Zones (Calculated for 4:1 ratio) -->
      <!-- Anxiety: Top Left Triangle -->
      <path d="M0,0 L340,0 L0,85 Z" fill="url(#anxietyGradient)" />
      
      <!-- Boredom: Bottom Right Triangle -->
      <path d="M60,100 L400,100 L400,15 Z" fill="url(#boredomGradient)" />

      <!-- Flow Channel: Diagonal Band -->
      <path 
        d="M0,85 L340,0 L400,15 L60,100 Z" 
        fill="rgba(16, 185, 129, 0.1)" 
        stroke="rgba(16, 185, 129, 0.3)" 
        stroke-width="0.5"
        stroke-dasharray="4 4"
      />

      <!-- Zone Labels -->
      <text x="20" y="25" class="zone-text anxiety-text">Anxiety</text>
      <text x="380" y="85" class="zone-text boredom-text" text-anchor="end">Boredom</text>
      <!-- Rotated approx -14 deg for 4:1 aspect ratio -->
      <text x="200" y="55" class="zone-text flow-text" text-anchor="middle" transform="rotate(-14 200 55)">Flow Channel</text>
    </svg>

    <!-- User Position -->
    <div 
      class="user-point"
      style="left: {x/4}%; top: {y}%;"
      title="Challenge: {Math.round(challenge * 100)}%, Skill: {Math.round(skill * 100)}%"
      in:fade={{ duration: 500 }}
    >
      <div class="pulse"></div>
      <div class="dot"></div>
    </div>
  </div>
</div>

<style>
  .flow-graph {
    width: 100%;
    height: 100%; /* Fill container */
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem 1rem 2.5rem 2.5rem; /* Extra padding for axes */
    position: relative;
  }

  .graph-container {
    width: 100%;
    height: 100%;
    position: relative;
    border-left: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }

  .graph-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .axis-label {
    position: absolute;
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .y-axis {
    top: 0;
    left: -1.5rem;
    transform-origin: left top;
    transform: rotate(-90deg) translateX(-100%);
  }

  .x-axis {
    bottom: -1.5rem;
    right: 0;
  }

  .zone-text {
    font-size: 12px; /* SVG units - Large and readable */
    font-family: var(--font-main);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    pointer-events: none;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5); /* Add shadow for contrast */
  }

  .anxiety-text { fill: #ef4444; opacity: 0.9; }
  .boredom-text { fill: #3b82f6; opacity: 0.9; }
  .flow-text { fill: #10b981; opacity: 1; }

  .user-point {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 10;
  }

  .dot {
    width: 12px;
    height: 12px;
    background: var(--color-accent);
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--color-background);
  }

  .pulse {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    background: var(--color-accent);
    border-radius: 50%;
    opacity: 0.5;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      width: 100%;
      height: 100%;
      opacity: 0.5;
    }
    100% {
      width: 300%;
      height: 300%;
      opacity: 0;
    }
  }
</style>
