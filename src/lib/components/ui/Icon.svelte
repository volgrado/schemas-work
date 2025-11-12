<!-- src/lib/components/ui/Icon.svelte -->
<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { IconName } from '$lib/types/iconName';
  import { online } from '$lib/stores/onlineStore.svelte'; // <-- IMPORT THE STORE

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
  {#if $online}
    <!-- If online, render the real icon from the network -->
    <Icon icon={iconString} width={size} height={size} {...rest} />
  {:else}
    <!-- If offline, render a simple fallback circle -->
    <div class="offline-fallback-circle" />
  {/if}
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

  /* Style for our offline fallback */
  .offline-fallback-circle {
    width: calc(
      var(--icon-size) * 0.5
    ); /* Make the circle 50% of the icon size */
    height: calc(var(--icon-size) * 0.5);
    border-radius: 50%;
    background-color: currentColor; /* Use the parent's text color */
    opacity: 0.5;
  }
</style>
