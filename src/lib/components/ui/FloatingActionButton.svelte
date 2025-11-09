<!-- src/lib/components/ui/FloatingActionButton.svelte -->
<script lang="ts">
  import type { TransitionConfig } from 'svelte/transition';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { IconName } from '$lib/types/iconName';

  type FlyAndScaleParams = { y: number; duration: number };

  let {
    icon,
    label,
    position = 'center' as 'center' | 'right' | 'left',
    ...rest
  } = $props<{
    icon: IconName;
    label: string;
    position?: 'center' | 'right' | 'left';
  }>();

  const flyAndScale = (
    node: Element,
    params: FlyAndScaleParams
  ): TransitionConfig => {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' || '' ? '' : style.transform;
    return {
      ...params,
      css: (t: number, u: number) => `
        transform: ${transform} scale(${t}) translateY(${u * params.y}px);
        opacity: ${t};
      `,
    };
  };
</script>

<div
  class="fab-wrapper"
  class:center={position === 'center'}
  class:right={position === 'right'}
  class:left={position === 'left'}
  transition:flyAndScale={{ y: 20, duration: 400 }}
>
  <!-- 
    FIX: Add `on:click` here.
    This forwards any click event listener from the parent component 
    directly to the inner Button component. This will resolve the 
    TypeScript error ts(2345).
  -->
  <Button {...rest} on:click variant="primary" size="lg" aria-label={label}>
    <Icon name={icon} size={20} />
    <span>{label}</span>
  </Button>
</div>

<style>
  /* Styles remain the same */
  .fab-wrapper {
    position: fixed;
    bottom: var(--space-lg);
    z-index: var(--z-fab);
    transition: transform 0.2s ease-out;
  }
  .fab-wrapper:hover {
    transform: translateY(-4px);
  }
  .center {
    left: 50%;
    transform: translateX(-50%);
  }
  .center:hover {
    transform: translateX(-50%) translateY(-4px);
  }
  .right {
    right: var(--space-lg);
  }
  .left {
    left: var(--space-lg);
  }
  :global(.fab-wrapper button) {
    box-shadow: var(--shadow-xl);
  }
</style>
