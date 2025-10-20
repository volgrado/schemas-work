<!-- src/lib/components/ui/Textarea.svelte -->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  // 1. REMOVE the incorrect import for $bindable
  import { autosize } from '$lib/actions/autosize'; // Optional: if you have this action

  // Use $bindable() directly. It's globally available thanks to the Svelte compiler.
  let {
    value = $bindable(''),
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
