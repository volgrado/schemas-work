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
    ...rest
  } = $props<
    {
      variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
      size?: 'sm' | 'md' | 'lg';
    } & HTMLButtonAttributes
  >(); // CORRECTED: Use the correct type here
</script>

<button
  class="btn"
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:btn-ghost={variant === 'ghost'}
  class:btn-icon={variant === 'icon'}
  class:btn-sm={size === 'sm'}
  class:btn-md={size === 'md'}
  class:btn-lg={size === 'lg'}
  on:click
  {...rest}
>
  <slot />
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
    border-radius: var(--border-radius-md); /** ENHANCEMENT: Use global token */

    /* --- Interaction & Animation --- */
    cursor: pointer;
    transition: var(--transition-fast); /** ENHANCEMENT: Use global token */
    outline: none;
  }

  /** ENHANCEMENT: Refined :active state for better tactile feedback */
  .btn:not(:disabled):active {
    transform: scale(0.96);
    transition-duration: 0.1s;
  }

  /** ENHANCEMENT: Consistent focus state with other components */
  .btn:focus-visible {
    box-shadow: 0 0 0 3px hsl(var(--color-accent-hsl) / 0.4);
  }

  /* --- Size Modifiers --- */
  .btn-sm {
    --btn-size: 32px;
    height: var(--btn-size);
    padding: 0 var(--space-sm);
    font-size: 0.875rem;
  }
  .btn-md {
    --btn-size: 40px;
    height: var(--btn-size);
    padding: 0 var(--space-md);
    font-size: 0.95rem;
  }
  .btn-lg {
    --btn-size: 48px;
    height: var(--btn-size);
    padding: 0 var(--space-lg);
    font-size: 1rem;
  }

  /* --- Variant Modifiers --- */

  /* Primary: The main call to action */
  .btn-primary {
    background-color: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
    /** ENHANCEMENT: A more premium "lift" effect */
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  .btn-primary:disabled {
    background-color: var(--color-gray-100);
    color: var(--color-gray-400);
    border-color: var(--color-gray-200);
    cursor: not-allowed;
  }

  /* Secondary: The default action */
  .btn-secondary {
    background-color: var(--color-background-raised);
    color: var(--color-text);
    /** ENHANCEMENT: Added border for better definition */
    border: 1px solid var(--color-border);
  }
  .btn-secondary:hover:not(:disabled) {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
  .btn-secondary:disabled {
    background-color: var(--color-gray-50);
    color: var(--color-gray-400);
    border-color: var(--color-border);
    cursor: not-allowed;
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
  }
  .btn-icon:hover:not(:disabled) {
    background-color: var(--btn-hover-bg);
    color: var(--color-accent);
  }
  .btn-icon:disabled {
    color: var(--color-gray-400);
    cursor: not-allowed;
  }

  /* --- Dark Mode Styles --- */
  :global(.dark-theme) .btn-primary:disabled {
    background-color: var(--color-gray-800);
    color: var(--color-gray-600);
    border-color: var(--color-gray-700);
  }
  :global(.dark-theme) .btn-secondary {
    background-color: var(--color-background-dark-raised);
    color: var(--color-text-dark);
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .btn-secondary:hover:not(:disabled) {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
  :global(.dark-theme) .btn-secondary:disabled {
    background-color: var(--color-background-dark);
    color: var(--color-gray-600);
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .btn-ghost {
    color: var(--color-text-dark-secondary);
  }
  :global(.dark-theme) .btn-ghost:hover:not(:disabled) {
    background-color: var(--btn-hover-bg-dark);
    color: var(--color-text-dark);
  }
  :global(.dark-theme) .btn-ghost:disabled {
    color: var(--color-gray-600);
  }
  :global(.dark-theme) .btn-icon {
    color: var(--color-text-dark-secondary);
  }
  :global(.dark-theme) .btn-icon:hover:not(:disabled) {
    background-color: var(--btn-hover-bg-dark);
    color: var(--color-accent);
  }
  :global(.dark-theme) .btn-icon:disabled {
    color: var(--color-gray-600);
  }
</style>
