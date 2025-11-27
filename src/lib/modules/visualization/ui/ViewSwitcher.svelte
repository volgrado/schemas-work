<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import FloatingActionButton from '$lib/core/ui/FloatingActionButton.svelte';

  const {
    colorMode,
    onColorChange,
  }: {
    colorMode: 'none' | 'by-level' | 'by-path';
    onColorChange?: (mode: 'none' | 'by-level' | 'by-path') => void;
  } = $props();

  function cycleColorMode() {
    const modes: ('none' | 'by-level' | 'by-path')[] = [
      'none',
      'by-level',
      'by-path',
    ];
    const currentIndex = modes.indexOf(colorMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    onColorChange?.(modes[nextIndex]);
  }

  function getColorModeIcon(mode: string): any {
    switch (mode) {
      case 'by-level':
        return 'layers';
      case 'by-path':
        return 'git-branch';
      default:
        return 'pen-tool';
    }
  }

  function getColorModeLabel(mode: string): string {
    switch (mode) {
      case 'by-level':
        return i18n.t('visualization.color_mode.by_level');
      case 'by-path':
        return i18n.t('visualization.color_mode.by_path');
      default:
        return i18n.t('visualization.color_mode.none');
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
