<script lang="ts">
  import { scale } from 'svelte/transition';

  interface Props {
    title: string;
    status: 'locked' | 'active' | 'mastered';
    type: string;
    onclick?: () => void;
  }

  let { title, status, type, onclick }: Props = $props();

  const icons: Record<string, string> = {
    core: '⚡',
    social: '💬',
    pragmatic: '💼',
    spatial: '🧭',
    abstract: '🧠',
    complex: '🔥'
  };

  const icon = icons[type] || '★';
</script>

<button 
  class="node-marker status-{status} type-{type}" 
  onclick={status !== 'locked' ? onclick : undefined}
  disabled={status === 'locked'}
  aria-label="{title} - {status}"
>
  <!-- Ambient Glow -->
  <div class="glow-field"></div>

  <!-- Ripple Effect for Active Nodes -->
  {#if status === 'active'}
    <div class="ripple"></div>
    <div class="ripple delay"></div>
  {/if}

  <div class="inner-orb">
    <span class="icon">{icon}</span>
  </div>

  <div class="label-tooltip">
    <span class="title">{title}</span>
    {#if status === 'mastered'}
      <span class="crown">👑</span>
    {/if}
  </div>
</button>

<style>
  .node-marker {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .node-marker:hover {
    transform: scale(1.1);
  }

  .node-marker:active {
    transform: scale(0.95);
  }

  /* The Glass Orb */
  .inner-orb {
    position: relative;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--color-background-translucent);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2;
    box-shadow: 
      inset 0 0 20px rgba(255, 255, 255, 0.1),
      0 4px 10px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .icon {
    font-size: 1.5rem;
    filter: grayscale(100%);
    opacity: 0.6;
    transition: all 0.3s ease;
  }

  /* Status Styles */
  .status-locked .inner-orb {
    background: rgba(15, 23, 42, 0.6);
    border-color: rgba(255, 255, 255, 0.05);
  }

  .status-active .inner-orb {
    background: rgba(var(--color-accent-rgb), 0.2);
    border-color: var(--color-accent);
    box-shadow: 
      inset 0 0 20px rgba(var(--color-accent-rgb), 0.3),
      0 0 15px rgba(var(--color-accent-rgb), 0.4);
  }

  .status-active .icon {
    filter: grayscale(0%);
    opacity: 1;
    text-shadow: 0 0 10px var(--color-accent);
  }

  .status-mastered .inner-orb {
    background: rgba(251, 191, 36, 0.2); /* Amber/Gold */
    border-color: #fbbf24;
    box-shadow: 
      inset 0 0 20px rgba(251, 191, 36, 0.3),
      0 0 15px rgba(251, 191, 36, 0.4);
  }

  .status-mastered .icon {
    filter: grayscale(0%);
    opacity: 1;
    text-shadow: 0 0 10px #fbbf24;
  }

  /* Ambient Glow Field */
  .glow-field {
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--color-accent) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.5s ease;
    z-index: 1;
    filter: blur(10px);
  }

  .status-active .glow-field {
    opacity: 0.4;
  }

  .status-mastered .glow-field {
    background: radial-gradient(circle, #fbbf24 0%, transparent 70%);
    opacity: 0.4;
  }

  /* Ripple Animation */
  .ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 1px solid var(--color-accent);
    opacity: 0;
    animation: ripple 3s infinite cubic-bezier(0, 0.2, 0.8, 1);
    z-index: 0;
  }

  .ripple.delay {
    animation-delay: 1.5s;
  }

  @keyframes ripple {
    0% { width: 60px; height: 60px; opacity: 0.8; border-width: 2px; }
    100% { width: 140px; height: 140px; opacity: 0; border-width: 0; }
  }

  /* Tooltip Label */
  .label-tooltip {
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%) translateY(10px);
    background: rgba(15, 23, 42, 0.9);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    white-space: nowrap;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(4px);
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .node-marker:hover .label-tooltip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .title {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text);
    letter-spacing: 0.02em;
  }

  .crown {
    font-size: 0.75rem;
  }
</style>
