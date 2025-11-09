<!-- src/lib/components/ui/Icon.svelte -->
<script lang="ts">
  // Step 1: Import the single Icon component from the new library
  import Icon from '@iconify/svelte';
  import type { IconName } from '$lib/types/iconName';

  let {
    name,
    size = 16,
    class: additionalClasses = '',
    ...rest
  } = $props<{
    name: IconName;
    size?: number | string;
    class?: string;
    // Allows any other props to be passed through
    [key: string]: any;
  }>();

  // Step 2: Dynamically create the icon string for Iconify.
  // We assume all icons come from the 'lucide' set, which matches Feather.
  const iconString = $derived(`lucide:${name}`);
</script>

<!-- 
  Step 3: Render the Iconify component.
  It's simpler and more robust. We don't need the giant switch statement anymore.
-->
<span
  class="icon-wrapper {additionalClasses}"
  aria-hidden="true"
  style="--icon-size: {size}px;"
>
  <Icon icon={iconString} width={size} height={size} {...rest} />
</span>

<style>
  .icon-wrapper {
    width: var(--icon-size);
    height: var(--icon-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    /* This ensures the icon inherits the color of its parent, like a font */
    color: inherit;
  }
</style>
