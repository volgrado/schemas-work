<!--
  @component
  Input

  @description
  A versatile, styled text input wrapper.
  It enhances the standard HTML `<input>` with slots for leading/trailing icons
  and consistent focus states that match the application's design system.

  @props
  - `value` (bindable string | number): The current value of the input.
  - `class` (string): Additional classes for the wrapper.
  - `children`:
    - `leading` (snippet): An icon or element to place at the start.
    - `trailing` (snippet): An icon or element to place at the end.
  - `...rest`: All other standard HTML input attributes (placeholder, type, disabled, etc.).
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    value = $bindable(''),
    class: additionalClasses = '',
    children, // Svelte 5 snippets for icons
    ...rest
  } = $props<
    {
      value?: string | number;
      class?: string;
      children?: {
        leading?: import('svelte').Snippet;
        trailing?: import('svelte').Snippet;
      };
    } & HTMLInputAttributes
  >();
</script>

<div class="input-wrapper {additionalClasses}">
  <!-- Leading Icon Slot -->
  {#if children?.leading}
    <span class="icon-wrapper leading-icon">
      {@render children.leading()}
    </span>
  {/if}

  <!--
    The core input element.
    Classes adjust padding based on icon presence.
    Styles like border, background, and focus are inherited from global app.css
  -->
  <input
    {...rest}
    class:has-leading-icon={children?.leading}
    class:has-trailing-icon={children?.trailing}
    bind:value
  />

  <!-- Trailing Icon Slot -->
  {#if children?.trailing}
    <span class="icon-wrapper trailing-icon">
      {@render children.trailing()}
    </span>
  {/if}
</div>

<style>
  .input-wrapper {
    position: relative;
    width: 100%;
  }

  .icon-wrapper {
    position: absolute;
    top: 0;
    bottom: 0;
    display: inline-flex;
    align-items: center;
    color: var(--color-text-tertiary);
    transition: color var(--duration-fast) var(--ease-out);
    pointer-events: none; /* Ensure clicks pass through to the input focus */
  }

  .leading-icon {
    left: 12px;
  }

  .trailing-icon {
    right: 12px;
  }

  /* Padding adjustments to prevent text overlap with icons */
  :global(input.has-leading-icon) {
    padding-left: calc(var(--space-sm) + 24px + var(--space-xs)) !important;
  }

  :global(input.has-trailing-icon) {
    padding-right: calc(var(--space-sm) + 24px + var(--space-xs)) !important;
  }

  /* Visual feedback: highlight icon when input is focused */
  .input-wrapper:focus-within .icon-wrapper {
    color: var(--color-accent);
  }
</style>
