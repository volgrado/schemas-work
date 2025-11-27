<!--
  @component
  Toggle

  @description
  A refined, scalable, and accessible switch-style toggle component.
  It replaces the native checkbox with a delightful sliding UI for boolean settings.

  Accessibility:
  - Associates the visual `<label>` with the hidden `<input>` via `for/id`.
  - Uses `role="switch"` for proper semantic context.
  - Supports keyboard navigation and focus visibility.

  @props
  - `checked` (bindable boolean): The toggle state.
  - `id` (string): Required unique identifier for accessibility.
  - `labelText` (string): Optional label displayed next to the switch.
  - `toggleWidth`, `toggleHeight`, `thumbSize` (string): CSS dimension overrides.
  - `...rest`: Standard HTML input attributes (e.g., `disabled`).
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    checked = $bindable(false),
    id,
    labelText = '',
    toggleWidth = '44px',
    toggleHeight = '24px',
    thumbSize = '20px',
    ...rest
  } = $props<
    {
      checked?: boolean;
      id: string;
      labelText?: string;
      toggleWidth?: string;
      toggleHeight?: string;
      thumbSize?: string;
    } & HTMLInputAttributes
  >();
</script>

<label
  class="toggle-label"
  for={id}
  style="
    --toggle-width: {toggleWidth};
    --toggle-height: {toggleHeight};
    --thumb-size: {thumbSize};
  "
>
  {#if labelText}
    <span class="label-text">{labelText}</span>
  {/if}

  <div class="toggle-switch">
    <!-- Hidden native checkbox for behavior -->
    <input type="checkbox" {id} bind:checked role="switch" {...rest} />
    <!-- Visual slider track -->
    <span class="slider"></span>
  </div>
</label>

<style>
  /* Container for label + switch */
  .toggle-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    user-select: none;
  }

  /* Switch wrapper for sizing */
  .toggle-switch {
    --thumb-padding: 2px;
    --translate-x: calc(
      var(--toggle-width) - var(--thumb-size) - (2 * var(--thumb-padding))
    );

    position: relative;
    display: inline-block;
    width: var(--toggle-width);
    height: var(--toggle-height);
    flex-shrink: 0;
  }

  /* Hide default checkbox visually but keep it accessible */
  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* The track */
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-gray-200);
    border-radius: var(--toggle-height);
    transition: var(--transition-fast);
  }

  /* The thumb (knob) */
  .slider:before {
    position: absolute;
    content: '';
    height: var(--thumb-size);
    width: var(--thumb-size);
    left: var(--thumb-padding);
    bottom: var(--thumb-padding);
    background-color: var(--color-toggle-thumb);
    border-radius: 50%;
    transition: var(--transition-fast);
    box-shadow: var(--shadow-md);
  }

  /* --- Interaction States --- */

  input:checked + .slider {
    background-color: var(--color-accent);
  }

  input:checked + .slider:before {
    transform: translateX(var(--translate-x));
  }

  input:focus-visible + .slider {
    box-shadow: 0 0 0 3px hsl(var(--color-accent-hsl) / 0.4);
  }

  input:disabled + .slider {
    background-color: var(--color-gray-100);
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Label styling */
  .label-text {
    color: var(--color-text-secondary);
    font-weight: 500;
    transition: color 0.3s ease;
  }

  /* Dim label when disabled */
  label:has(input:disabled) .label-text {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* --- Dark Theme --- */
  :global(.dark-theme) .slider {
    background-color: var(--color-gray-700);
  }

  :global(.dark-theme) input:disabled + .slider {
    background-color: var(--color-gray-800);
  }

  :global(.dark-theme) .label-text {
    color: var(--color-text-dark-secondary);
  }
</style>
