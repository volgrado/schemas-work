<!--
  @component
  CommandButton

  @description
  An exceptional, specialized button component designed exclusively for use within the
  command bar's view lists. It encapsulates the specific styling, hover effects, and
  micro-interactions for a command item, providing a consistent and polished user
  experience across all command bar views.

  It acts as a single source of truth for command styling, ensuring that any design
  updates are propagated everywhere it's used.

  @props
  - `class`: {string} (optional) - Additional CSS classes for layout control.
  - `@restProps`: All other standard HTML button attributes (`disabled`, `onclick`, etc.)
    are forwarded directly to the underlying `<button>` element.
-->
<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  // --- Svelte 5 Props ---
  let {
    class: additionalClasses = '',
    children, // Capture the default slot
    ...rest
  } = $props<HTMLButtonAttributes & { class?: string; children?: any }>();
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
    This `:global` selector is a pragmatic way to style the `Icon` component
    passed into the default slot. It targets any SVG within the button, which
    is reliable given this component's specific, controlled usage.
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

  .action-button:active:not(:disabled) {
    transform: scale(0.985); /* Tactile feedback on click */
  }

  .action-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
