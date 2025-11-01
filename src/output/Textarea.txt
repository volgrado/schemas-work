<!--
  @component
  Textarea

  A standardized, reusable textarea component that automatically resizes to fit its content.
  It provides consistent styling for form inputs across the application.

  Props:
  - `value`: {string} - The value of the textarea. This prop is bindable.
  - `class`: {string} - Additional CSS classes to apply to the textarea element.

  @restProps All other standard HTML attributes (e.g., `placeholder`, `rows`, `disabled`) are passed
  directly to the underlying `<textarea>` element.
-->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { autosize } from '$lib/actions/autosize';

  let {
    /**
     * @prop {string} [value='']
     * The textarea's value. Can be bound to a variable in the parent component.
     * @bindable
     */
    value = $bindable(''),
    /**
     * @prop {string} [class='']
     * Optional CSS classes to add to the textarea element for custom styling.
     */
    class: additionalClasses = '',
    ...rest
  } = $props<{ value?: string; class?: string } & HTMLTextareaAttributes>();
</script>

<textarea
  {...rest}
  class="custom-textarea {additionalClasses}"
  bind:value
  use:autosize
></textarea>

<style>
  .custom-textarea {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-background);
    color: var(--color-text);
    font-size: 0.95rem;
    font-family: inherit;
    line-height: 1.5;
    resize: vertical;
    min-height: 80px; /* A reasonable default minimum height */
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .custom-textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px hsl(var(--color-accent-hsl) / 0.2);
  }

  /* Basic dark theme adjustments */
  :global(.dark-theme) .custom-textarea {
    border-color: var(--color-border-dark);
    background-color: var(--color-background-dark-raised);
    color: var(--color-text-dark);
  }
</style>
