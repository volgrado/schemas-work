<!-- src/lib/components/ui/Toggle.svelte -->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  // 1. REMOVE the incorrect import for $bindable. It is not needed.

  // Use $bindable() directly to mark the 'checked' prop for two-way binding.
  let {
    checked = $bindable(false),
    id, // The id is required to link the label for accessibility
    ...rest
  } = $props<
    {
      checked?: boolean;
      id: string;
    } & HTMLInputAttributes
  >();
</script>

<label class="toggle-switch" for={id}>
  <input type="checkbox" {id} bind:checked {...rest} />
  <span class="slider"></span>
</label>

<style>
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 38px;
    height: 22px;
  }

  /* Hide default HTML checkbox */
  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* The slider (the track) */
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-gray-300);
    transition: 0.3s;
    border-radius: 22px;
  }

  /* The knob */
  .slider:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: var(--color-accent);
  }

  input:checked + .slider:before {
    transform: translateX(16px);
  }

  /* Focus state for accessibility */
  input:focus-visible + .slider {
    box-shadow: 0 0 1px var(--color-accent);
  }

  :global(.dark-theme) .slider {
    background-color: var(--color-gray-600);
  }
</style>
