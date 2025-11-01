<!--
  @component
  Input

  A standardized, reusable text input component. It provides consistent styling
  for form inputs across the application, including focus states and dark mode support.

  This component is designed to be a thin wrapper around the native `<input>` element,
  allowing for two-way binding on the `value` prop and forwarding all other standard
  HTML input attributes.

  Props:
  - `value`: {string | number} - The value of the input. This prop is bindable.
  - `class`: {string} - Additional CSS classes to apply to the input element.

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
     * Optional CSS classes to add to the input element for custom styling.
     */
    class: additionalClasses = '',
    ...rest
  } = $props<
    { value?: string | number; class?: string } & HTMLInputAttributes
  >();
</script>

<input {...rest} class="custom-input {additionalClasses}" bind:value />

<style>
  .custom-input {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-background);
    color: var(--color-text);
    font-size: 0.95rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .custom-input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px hsl(var(--color-accent-hsl) / 0.2);
  }

  /* Basic dark theme adjustments */
  :global(.dark-theme) .custom-input {
    border-color: var(--color-border-dark);
    background-color: var(--color-background-dark-raised);
    color: var(--color-text-dark);
  }
</style>
