<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { ManifestoData } from './ManifestoForm.svelte';

  interface Props {
    data: ManifestoData | null;
    onComplete: () => void;
  }

  let { data, onComplete }: Props = $props();

  let currentStep = $state(0);
  let progress = $state(0);

  const analysisSteps = [
    { label: 'Parsing Sovereign Intent...', detail: data?.intent || 'Analyzing...' },
    { label: 'Mapping Belief State Priors...', detail: `Entropy Level: ${data?.beliefState || 'Unknown'}` },
    { label: 'Calibrating Embodied Constraints...', detail: `Vessel: ${data?.vessel.join(', ') || 'Standard'}` },
    { label: 'Locating Social Attractors...', detail: `Context: ${data?.ecosystem || 'Global'}` },
    { label: 'Generating Spiral Curriculum...', detail: 'Synthesizing Graph...' }
  ];

  onMount(() => {
    const totalDuration = 4000; // 4 seconds total
    const stepDuration = totalDuration / analysisSteps.length;

    const interval = setInterval(() => {
      if (currentStep < analysisSteps.length - 1) {
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 500);
      }
    }, stepDuration);

    // Smooth progress bar
    const progressInterval = setInterval(() => {
      if (progress < 100) {
        progress += 1;
      } else {
        clearInterval(progressInterval);
      }
    }, totalDuration / 100);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  });
</script>

<div class="evaluation-matrix" in:fade>
  <div class="matrix-content">
    <div class="scanner-line"></div>
    
    <div class="status-display">
      <div class="step-label">{analysisSteps[currentStep].label}</div>
      <div class="step-detail">{analysisSteps[currentStep].detail}</div>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>

    <div class="data-stream">
      {#each analysisSteps as step, i}
        <div class="stream-item" class:active={i === currentStep} class:done={i < currentStep}>
          <span class="indicator">{i < currentStep ? '✓' : i === currentStep ? '➤' : '○'}</span>
          <span class="text">{step.label}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .evaluation-matrix {
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Courier New', monospace;
    color: var(--color-accent);
    position: relative;
  }

  .matrix-content {
    width: 100%;
    max-width: 600px;
    padding: 2rem;
    position: relative;
    z-index: 2;
  }

  .scanner-line {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--color-accent);
    box-shadow: 0 0 10px var(--color-accent);
    animation: scan 2s linear infinite;
    opacity: 0.5;
    pointer-events: none;
  }

  @keyframes scan {
    0% { top: 0; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }

  .status-display {
    margin-bottom: 3rem;
    text-align: center;
  }

  .step-label {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .step-detail {
    font-size: 1rem;
    color: var(--color-text-secondary);
    min-height: 1.5em;
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    margin-bottom: 3rem;
    position: relative;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-accent);
    box-shadow: 0 0 10px var(--color-accent);
    transition: width 0.1s linear;
  }

  .data-stream {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    opacity: 0.8;
  }

  .stream-item {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    transition: all 0.3s ease;
  }

  .stream-item.active {
    color: var(--color-accent);
    transform: translateX(10px);
    font-weight: bold;
  }

  .stream-item.done {
    color: var(--color-success, #4ade80);
    opacity: 0.5;
  }
</style>
