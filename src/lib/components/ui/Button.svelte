<!--
  @component
  Button

  An exceptional, reusable button component that serves as the core interactive element for the
  application. It features refined micro-interactions, multiple variants for clear visual hierarchy,
  and is built upon the application's core design system for perfect consistency.

  @props All standard HTML attributes (e.g., `disabled`, `aria-label`, `type`) are passed
  directly to the underlying `<button>` element.
-->
<script lang="ts">
  // CORRECTED: Import the correct type from 'svelte/elements'
  import type { HTMLButtonAttributes } from 'svelte/elements';

  // SVELTE 5 RUNES UPDATE:
  let {
    variant = 'primary',
    size = 'md',
    children,
    ...rest
  } = $props<
    {
      variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger';
      size?: 'sm' | 'md' | 'lg';
      children?: import('svelte').Snippet;
    } & HTMLButtonAttributes
  >(); // CORRECTED: Use the correct type here
</script>

<button
  class="btn"
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:btn-ghost={variant === 'ghost'}
  class:btn-icon={variant === 'icon'}
  class:btn-danger={variant === 'danger'}
  class:btn-sm={size === 'sm'}
  class:btn-md={size === 'md'}
  class:btn-lg={size === 'lg'}
  {...rest}
>
  {@render children?.()}
</button>

<style>
  /* --- STYLES REMAIN UNCHANGED --- */
  .btn {
    /* --- Structure & Alignment --- */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    user-select: none;

    /* --- Appearance --- */
    border: 1px solid transparent; /* Reserve space for border */
    font-family: var(--font-main);
    font-weight: 600;
    border-radius: var(--radius-md); /** ENHANCEMENT: Use global token */

    /* --- Interaction & Animation --- */
    cursor: pointer;
    transition: var(--transition-fast); /** ENHANCEMENT: Use global token */
    outline: none;
  }

  /** ENHANCEMENT: Refined :active state for better tactile feedback */
  .btn:not(:disabled):active {
    transform: scale(0.98); /* Subtler scale */
    transition-duration: 0.1s;
  }

  /** ENHANCEMENT: Consistent focus state with other components */
  .btn:focus-visible {
    box-shadow: 0 0 0 3px hsl(var(--color-accent-hsl) / 0.3); /* Match app.css */
  }

  /* --- Size Modifiers --- */
  .btn-sm {
    --btn-size: 32px;
    height: var(--btn-size);
    padding: 0 var(--space-sm);
    font-size: var(--font-size-sm);
  }
  .btn-md {
    --btn-size: 40px;
    height: var(--btn-size);
    padding: 0 var(--space-md);
    font-size: var(--font-size-base);
  }
  .btn-lg {
    --btn-size: 48px;
    height: var(--btn-size);
    padding: 0 var(--space-lg);
    font-size: var(--font-size-lg);
  }

  /* --- Variant Modifiers --- */

  /* Primary: The main call to action */
  .btn-primary {
    background-color: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
    box-shadow: var(--shadow-sm);
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
    /** ENHANCEMENT: A more premium "lift" effect */
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-primary:disabled {
    background-color: var(--color-gray-100);
    color: var(--color-gray-400);
    border-color: var(--color-gray-200);
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Secondary: The default action */
  .btn-secondary {
    background-color: var(--color-background-raised);
    color: var(--color-text);
    /** ENHANCEMENT: Added border for better definition */
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  }
  .btn-secondary:hover:not(:disabled) {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background-color: var(--btn-hover-bg);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-secondary:disabled {
    background-color: var(--color-gray-50);
    color: var(--color-gray-400);
    border-color: var(--color-border);
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Ghost: For subtle, tertiary actions */
  .btn-ghost {
    background-color: transparent;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  .btn-ghost:hover:not(:disabled) {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }
  .btn-ghost:disabled {
    color: var(--color-gray-400);
    cursor: not-allowed;
  }

  /* Icon: Square buttons for toolbars, etc. */
  .btn-icon {
    background-color: transparent;
    color: var(--color-text-secondary);
    width: var(--btn-size);
    padding: 0;
    gap: 0;
    border-radius: var(--radius-md);
  }
  .btn-icon:hover:not(:disabled) {
    background-color: var(--btn-hover-bg);
    color: var(--color-accent);
  }
  .btn-icon:disabled {
    color: var(--color-gray-400);
    cursor: not-allowed;
  }

  /* Danger: For destructive actions */
  .btn-danger {
    background-color: var(--color-danger);
    color: white;
    border-color: var(--color-danger);
    box-shadow: var(--shadow-sm);
  }
  .btn-danger:hover:not(:disabled) {
    background-color: var(--color-red-600);
    border-color: var(--color-red-600);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-danger:disabled {
    background-color: var(--color-gray-100);
    color: var(--color-gray-400);
    border-color: var(--color-gray-200);
    cursor: not-allowed;
    box-shadow: none;
  }

  /* --- Dark Mode Styles --- */
  :global(.dark-theme) .btn-primary:disabled {
    background-color: var(--color-gray-800);
    color: var(--color-gray-600);
    border-color: var(--color-gray-700);
  }
  :global(.dark-theme) .btn-secondary {
    background-color: var(--color-background-raised);
    color: var(--color-text);
    border-color: var(--color-border);
  }
  :global(.dark-theme) .btn-secondary:hover:not(:disabled) {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background-color: var(--btn-hover-bg);
  }
  :global(.dark-theme) .btn-secondary:disabled {
    background-color: var(--color-background-dark);
    color: var(--color-gray-600);
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .btn-ghost {
    color: var(--color-text-secondary);
  }
  :global(.dark-theme) .btn-ghost:hover:not(:disabled) {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }
  :global(.dark-theme) .btn-ghost:disabled {
    color: var(--color-gray-600);
  }
  :global(.dark-theme) .btn-icon {
    color: var(--color-text-secondary);
  }
  :global(.dark-theme) .btn-icon:hover:not(:disabled) {
    background-color: var(--btn-hover-bg);
    color: var(--color-accent);
  }
  :global(.dark-theme) .btn-icon:disabled {
    color: var(--color-gray-600);
  }
</style>
