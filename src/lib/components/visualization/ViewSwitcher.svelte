<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FloatingActionButton from '$lib/core/ui/FloatingActionButton.svelte';
  import { t } from '$lib/utils/i18n';

  let { 
    colorMode 
  }: { 
    colorMode: 'none' | 'by-level' | 'by-path';
  } = $props();

  const dispatch = createEventDispatcher<{
    colorChange: 'none' | 'by-level' | 'by-path';
  }>();

  function cycleColorMode() {
    const modes: ('none' | 'by-level' | 'by-path')[] = ['none', 'by-level', 'by-path'];
    const currentIndex = modes.indexOf(colorMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    dispatch('colorChange', modes[nextIndex]);
  }

  function getColorModeIcon(mode: string): any {
    switch (mode) {
      case 'by-level': return 'layers';
      case 'by-path': return 'git-branch';
      default: return 'pen-tool';
    }
  }

  function getColorModeLabel(mode: string): string {
    switch (mode) {
      case 'by-level': return $t('visualization.color_mode.by_level');
      case 'by-path': return $t('visualization.color_mode.by_path');
      default: return $t('visualization.color_mode.none');
    }
  }
</script>

<div class="view-switcher">
  <FloatingActionButton
    icon={getColorModeIcon(colorMode)}
    label={getColorModeLabel(colorMode)}
    onclick={cycleColorMode}
  />
</div>

<style>
  .view-switcher {
    position: absolute;
    top: var(--space-lg);
    right: var(--space-lg);
    z-index: 10;
  }

  /* Mobile Adaptation */
  @media (max-width: 768px) {
    .view-switcher {
      top: var(--space-lg);
      right: var(--space-lg);
    }
  }
</style>
