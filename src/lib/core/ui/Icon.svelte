<!-- src/lib/components/ui/Icon.svelte -->
<script lang="ts">
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
    [key: string]: any;
  }>();

  // Dynamically create the icon string for Iconify.
  const iconString = $derived(`lucide:${name}`);
</script>

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
    color: inherit;
  }
</style>
