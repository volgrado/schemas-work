<!--
  @component
  Toggle

  A refined, scalable, and accessible switch-style toggle component. It provides a 
  delightful UI for turning settings on or off, with smooth animations and a clean,
  modern aesthetic that aligns with the application's design system.

  Accessibility is handled by associating the visual `<label>` with the hidden `<input>`
  via the `for` and `id` attributes. The `role="switch"` provides better context for
  assistive technologies. It has clear focus and disabled states.

  Props:
  - `checked`: {boolean} - The state of the toggle. This prop is bindable.
  - `id`: {string} - A unique ID is required to link the label to the input for accessibility.
  - `labelText`: {string} (optional) - Text to display next to the toggle switch.
  - `toggleWidth`: {string} (optional) - The total width of the switch.
  - `toggleHeight`: {string} (optional) - The total height of the switch.
  - `thumbSize`: {string} (optional) - The diameter of the sliding knob.

  @restProps All other standard HTML attributes (like `disabled`) are passed to the `<input>` element.
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    /**
     * @prop {boolean} [checked=false]
     * The state of the toggle (on/off). Can be bound to a variable in the parent component.
     * @bindable
     */
    checked = $bindable(false),

    /**
     * @prop {string} id
     * A unique ID is required to associate the label with the input, which is crucial for accessibility.
     */
    id,

    /**
     * @prop {string} [labelText]
     * Optional text label to display alongside the toggle switch.
     */
    labelText = '',

    /**
     * @prop {string} [toggleWidth='44px']
     * The total width of the switch component.
     */
    toggleWidth = '44px',

    /**
     * @prop {string} [toggleHeight='24px']
     * The total height of the switch component.
     */
    toggleHeight = '24px',

    /**
     * @prop {string} [thumbSize='20px']
     * The diameter of the sliding knob.
     */
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
    <input type="checkbox" {id} bind:checked role="switch" {...rest} />
    <span class="slider"></span>
  </div>
</label>

<style>
  /* The main container for the label and the visual switch */
  .toggle-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    user-select: none; /* Prevents text selection on click */
  }

  /* Wrapper for the visual toggle parts for sizing */
  .toggle-switch {
    /* Dynamic sizing is controlled by props passed to the parent label's style attribute */
    --thumb-padding: 2px;
    --translate-x: calc(
      var(--toggle-width) - var(--thumb-size) - (2 * var(--thumb-padding))
    );

    position: relative;
    display: inline-block;
    width: var(--toggle-width);
    height: var(--toggle-height);
    flex-shrink: 0; /* Prevents the switch from shrinking in a flex container */
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
    background-color: var(--color-gray-200);
    border-radius: var(--toggle-height); /* Creates the perfect pill shape */
    transition: var(--transition-fast);
  }

  /* The knob (the thumb) */
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

  /* --- States --- */

  input:checked + .slider {
    background-color: var(--color-accent);
  }

  input:checked + .slider:before {
    transform: translateX(var(--translate-x));
  }

  /* Consistent, modern focus style */
  input:focus-visible + .slider {
    box-shadow: 0 0 0 3px hsl(var(--color-accent-hsl) / 0.4);
  }

  /* IMPROVEMENT: Visual feedback for the disabled state */
  input:disabled + .slider {
    background-color: var(--color-gray-100);
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* --- Label Text --- */
  .label-text {
    color: var(--color-text-secondary);
    font-weight: 500;
    transition: color 0.3s ease;
  }

  /* IMPROVEMENT: Dim the label text when the control is disabled */
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
