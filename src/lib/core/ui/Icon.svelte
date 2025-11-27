<!--
  @component
  Icon

  @description
  A generic wrapper component for rendering SVG icons using the `@iconify/svelte` library.
  It enforces the use of Lucide icons (via the `lucide:` prefix) for design consistency
  and bundles them offline (via `iconService.ts`).

  @props
  - `name` (IconName): The specific name of the Lucide icon to render (e.g., 'home', 'settings').
  - `size` (number | string): The width and height of the icon in pixels. Defaults to 16.
  - `class` (string): Optional CSS classes to append to the wrapper.
  - `...rest`: Any other attributes are passed down to the underlying Iconify component.
-->
<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { IconName } from '$lib/core/domain/iconName';

  const {
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

  // Construct the full icon identifier string required by Iconify (e.g., "lucide:menu").
  const iconString = $derived(`lucide:${name}`);
</script>

<!--
  Wrapper span ensures consistent sizing and alignment context.
  aria-hidden="true" is set by default as icons are decorative;
  meaningful icons should be accompanied by aria-labels on their buttons.
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
    color: inherit; /* Inherit text color from parent */
  }
</style>
