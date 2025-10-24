<!--
  @component
  Toggle

  A standard switch-style toggle component. It's a styled wrapper around a native
  checkbox input, providing a common UI pattern for turning a setting on or off.

  Accessibility is handled by associating the visual `<label>` with the hidden `<input>`
  via the `for` and `id` attributes.

  Props:
  - `checked`: {boolean} - The state of the toggle. This prop is bindable.
  - `id`: {string} - A unique ID is required to link the label to the input for accessibility.

  @restProps All other standard HTML attributes are passed directly to the underlying `<input>` element.
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
