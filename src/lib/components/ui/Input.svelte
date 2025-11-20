<!--
  @component
  Input

  An exceptional, reusable text input component. It serves as a powerful and flexible
  building block for all forms in the application.

  This component inherits its core styling from the global stylesheet for perfect design
  consistency and features slots for leading and trailing icons, enabling rich UI patterns.

  Props:
  - `value`: {string | number} - The bindable value of the input.
  - `class`: {string} - Additional CSS classes to apply to the main wrapper element.

  Slots:
  - `leading`: An area for an icon or element at the start of the input.
  - `trailing`: An area for an icon or element at the end of the input.

  @restProps All other standard HTML attributes (e.g., `placeholder`, `type`, `disabled`) are passed
  directly to the underlying `<input>` element.
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    /**
     * @prop {string | number} [value='']
     * The input's value. Can be bound to a variable in the parent component.
     * @bindable
     */
    value = $bindable(''),
    /**
     * @prop {string} [class='']
     * Optional CSS classes to add to the wrapper element for layout control.
     */
    class: additionalClasses = '',
    children, // Capture slots for Svelte 5
    ...rest
  } = $props<
    {
      value?: string | number;
      class?: string;
      children?: any;
    } & HTMLInputAttributes
  >();
</script>

<!-- ENHANCEMENT: A wrapper to position the input and potential icons -->
<div class="input-wrapper {additionalClasses}">
  {#if children.leading}
    <span class="icon-wrapper leading-icon">
      {@render children.leading()}
    </span>
  {/if}

  <input
    {...rest}
    class:has-leading-icon={children.leading}
    class:has-trailing-icon={children.trailing}
    bind:value
  />

  {#if children.trailing}
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

  /*
	  ENHANCEMENT: All core input styling (border, background, focus, etc.) is now
	  inherited from the global `input[type='text']` styles in `app.css`.
	  This component's styles are only for managing the icon layout.
	*/

  .icon-wrapper {
    position: absolute;
    top: 0;
    bottom: 0;
    display: inline-flex;
    align-items: center;
    color: var(--color-text-tertiary);
    transition: color 0.2s ease;
    pointer-events: none; /* Allows click-through to the input */
  }

  .leading-icon {
    left: 12px;
  }

  .trailing-icon {
    right: 12px;
  }

  /* When an icon is present, add padding to the input so text doesn't overlap it */
  :global(input.has-leading-icon) {
    padding-left: calc(var(--space-sm) + 24px + var(--space-xs)) !important; /* 8 + 24 + 4 = 36px */
  }

  :global(input.has-trailing-icon) {
    padding-right: calc(var(--space-sm) + 24px + var(--space-xs)) !important;
  }

  /* ENHANCEMENT: When the user focuses the input, the icon becomes more prominent */
  .input-wrapper:focus-within .icon-wrapper {
    color: var(--color-accent);
  }
</style>
