<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { 
    currentView,
    colorMode = 'none'
  }: { 
    currentView: 'tree' | 'radial' | 'treemap';
    colorMode?: 'none' | 'by-level' | 'by-path';
  } = $props();

  const dispatch = createEventDispatcher<{ 
    change: 'tree' | 'radial' | 'treemap';
    colorChange: 'none' | 'by-level' | 'by-path';
  }>();

  function setView(view: 'tree' | 'radial' | 'treemap') {
    dispatch('change', view);
  }

  function cycleColorMode() {
    const modes: Array<'none' | 'by-level' | 'by-path'> = ['none', 'by-level', 'by-path'];
    const currentIndex = modes.indexOf(colorMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    dispatch('colorChange', nextMode);
  }

  const colorModeLabels = {
    'none': 'No Color',
    'by-level': 'Color by Level',
    'by-path': 'Color by Path'
  };
</script>

<div class="view-switcher glass-panel">
  <div class="button-group">
    <button 
      class="switch-btn" 
      class:active={currentView === 'tree'} 
      onclick={() => setView('tree')}
      title="Standard Tree"
    >
      <Icon name="git-branch" size={18} />
    </button>
    <button 
      class="switch-btn" 
      class:active={currentView === 'radial'} 
      onclick={() => setView('radial')}
      title="Radial Tree"
    >
      <Icon name="target" size={18} />
    </button>
    <button 
      class="switch-btn" 
      class:active={currentView === 'treemap'} 
      onclick={() => setView('treemap')}
      title="Word Count Treemap"
    >
      <Icon name="layout" size={18} />
    </button>
    
    <div class="divider"></div>
    
    <button 
      class="switch-btn color-btn" 
      onclick={cycleColorMode}
      title={colorModeLabels[colorMode]}
    >
      <Icon name="pen-tool" size={18} />
      {#if colorMode !== 'none'}
        <span class="badge"></span>
      {/if}
    </button>
  </div>
</div>

<style>
  .view-switcher {
    position: absolute;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    padding: 4px;
    border-radius: var(--radius-full);
    z-index: var(--z-elevated);
    display: flex;
    gap: 4px;
  }

  .button-group {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: var(--color-border);
    margin: 0 4px;
  }

  .switch-btn {
    background: transparent;
    border: none;
    padding: 8px 12px;
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    position: relative;
  }

  .switch-btn:hover {
    background: var(--color-gray-100);
    color: var(--color-text);
  }

  .switch-btn.active {
    background: var(--color-accent);
    color: white;
    box-shadow: var(--shadow-sm);
  }

  .color-btn .badge {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent);
    border: 1px solid white;
  }
</style>
