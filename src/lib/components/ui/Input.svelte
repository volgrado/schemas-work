<!-- src/lib/components/ui/Input.svelte -->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  // 1. REMOVE the incorrect import for $bindable. It is not needed.

  // 2. Use $bindable() directly to mark the 'value' prop for two-way binding.
  // It's globally available in Svelte files thanks to the compiler.
  let {
    value = $bindable(''),
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
