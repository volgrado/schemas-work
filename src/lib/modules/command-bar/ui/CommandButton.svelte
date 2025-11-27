<!--
  @component
  CommandButton

  @description
  A specialized button component optimized for use within Command Bar lists.
  It encapsulates the standard row layout (Icon + Text) and interaction states
  (hover, focus, active) expected in a Spotlight-style interface.

  Features:
  - **Layout:** Flex-based row layout with consistent padding and gap.
  - **Interactions:** Subtle scale effect on active, accent color on hover.
  - **Slots:** Expects an `Icon` and text label in the default slot.

  @props
  - `class` (string): Additional CSS classes.
  - `...rest`: Forwarded HTML button attributes.
-->
<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  const {
    class: additionalClasses = '',
    children, // Svelte 5 snippet for content
    ...rest
  } = $props<
    HTMLButtonAttributes & {
      class?: string;
      children?: import('svelte').Snippet;
    }
  >();
</script>

<button class="action-button {additionalClasses}" {...rest}>
  {@render children?.()}
</button>

<style>
  .action-button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    border: none;
    background: none;
    font-family: var(--font-main);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
    border-radius: var(--border-radius-md);
    text-align: left;
    gap: 12px;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      transform 0.1s ease;
    outline: none;
  }

  .action-button:hover:not(:disabled),
  .action-button:focus-visible {
    background-color: var(--btn-hover-bg);
  }

  .action-button:focus-visible {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  /*
    Target the SVG (Icon) within the button to apply hover effects.
    This ensures the icon scales and changes color along with the button state.
  */
  :global(.action-button svg) {
    color: var(--color-gray-500);
    transition:
      transform 0.2s ease,
      color 0.2s ease;
  }

  .action-button:hover:not(:disabled) :global(svg),
  .action-button:focus-visible :global(svg) {
    color: var(--color-accent);
    transform: scale(1.1);
  }

  /* Tactile feedback */
  .action-button:active:not(:disabled) {
    transform: scale(0.985);
  }

  .action-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
