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
  const {
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
  .btn {
    /* --- Structure & Alignment --- */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    user-select: none;

    /* --- Appearance --- */
    border: 1px solid transparent;
    font-family: var(--font-main);
    font-weight: 600;
    border-radius: var(--radius-md);

    /* --- Interaction & Animation --- */
    cursor: pointer;
    transition: var(--transition-fast);
    outline: none;
  }

  .btn:not(:disabled):active {
    transform: scale(0.98);
  }

  .btn:focus-visible {
    box-shadow: 0 0 0 3px hsl(var(--color-accent-hsl) / 0.3);
  }

  /* --- Size Modifiers --- */
  .btn-sm {
    height: 32px;
    padding: 0 var(--space-sm);
    font-size: var(--font-size-sm);
  }
  .btn-md {
    height: 40px;
    padding: 0 var(--space-md);
    font-size: var(--font-size-base);
  }
  .btn-lg {
    height: 48px;
    padding: 0 var(--space-lg);
    font-size: var(--font-size-lg);
  }

  /* --- Variant Modifiers --- */

  /* Primary */
  .btn-primary {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
    box-shadow: var(--shadow-sm);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    overflow: hidden; /* For shine effect */
    position: relative;
  }
  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }
  /* Shine Effect */
  .btn-primary::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transform: skewX(-20deg);
    transition: none;
  }
  .btn-primary:hover:not(:disabled)::after {
    animation: shine 0.75s;
  }
  @keyframes shine {
    100% {
      left: 200%;
    }
  }
  .btn-primary:disabled {
    background: var(--color-gray-200);
    color: var(--color-gray-400);
    border-color: var(--color-gray-200);
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Secondary */
  .btn-secondary {
    background-color: var(--color-background-raised);
    color: var(--color-text);
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

  /* Ghost */
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

  /* Icon */
  .btn-icon {
    background-color: transparent;
    color: var(--color-text-secondary);
    width: 40px; /* Default to md size */
    padding: 0;
    border-radius: var(--radius-md);
  }
  .btn-icon.btn-sm {
    width: 32px;
  }
  .btn-icon.btn-lg {
    width: 48px;
  }

  .btn-icon:hover:not(:disabled) {
    background-color: var(--btn-hover-bg);
    color: var(--color-accent);
  }
  .btn-icon:disabled {
    color: var(--color-gray-400);
    cursor: not-allowed;
  }

  /* Danger */
  .btn-danger {
    background-color: var(--color-danger);
    color: white;
    border-color: var(--color-danger);
    box-shadow: var(--shadow-sm);
  }
  .btn-danger:hover:not(:disabled) {
    background-color: #c53030; /* Darker red */
    border-color: #c53030;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-danger:disabled {
    background-color: var(--color-gray-200);
    color: var(--color-gray-400);
    border-color: var(--color-gray-200);
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Dark Mode Overrides */
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
  :global(.dark-theme) .btn-secondary:disabled {
    background-color: var(--color-background-dark);
    color: var(--color-gray-600);
    border-color: var(--color-border-dark);
  }
</style>
