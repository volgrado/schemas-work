<!--
  @component
  Button

  A generic, reusable button component designed to be consistent with the application's
  minimalist and clean aesthetic. It supports different visual variants and sizes to cater
  to various use cases, from primary calls-to-action to subtle, low-priority actions.

  Props:
  - `variant`: The visual style of the button. Can be 'primary', 'secondary', or 'ghost'. Defaults to 'primary'.
  - `size`: The size of the button. Can be 'sm', 'md', or 'lg'. Defaults to 'md'.

  Slots:
  - `default`: The content to be displayed inside the button (e.g., text, an icon).

  @restProps All other standard HTML attributes (e.g., `disabled`, `aria-label`) are passed
  directly to the underlying `<button>` element.
-->
<script lang="ts">
  /**
   * @prop {'primary' | 'secondary' | 'ghost'} [variant='primary']
   * The visual and hierarchical variant of the button.
   */
  export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';

  /**
   * @prop {'sm' | 'md' | 'lg'} [size='md']
   * The size of the button.
   */
  export let size: 'sm' | 'md' | 'lg' = 'md';
</script>

<button
  class="btn"
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:btn-ghost={variant === 'ghost'}
  class:btn-sm={size === 'sm'}
  class:btn-md={size === 'md'}
  class:btn-lg={size === 'lg'}
  on:click
  {...$$restProps}
>
  <slot />
</button>

<style>
  .btn {
    /* --- Structure & Alignment --- */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);

    /* --- Appearance --- */
    border: none;
    font-family: var(--font-main);
    font-weight: 600; /* A heavier weight for better legibility and presence. */
    border-radius: var(--space-sm);

    /* --- Interaction & Animation --- */
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.1s ease,
      box-shadow 0.2s ease;

    outline: none;
  }

  /* Tactile feedback when the button is pressed. */
  .btn:active {
    transform: scale(0.97);
  }

  /* The focus glow now uses our global color variables. */
  .btn:focus-visible {
    box-shadow: 0 0 0 3px hsl(var(--color-accent-hsl) / 0.35);
  }

  /* --- Size Modifiers --- */
  .btn-sm { height: 32px; padding: 0 var(--space-sm); font-size: 0.85rem; }
  .btn-md { height: 40px; padding: 0 var(--space-md); font-size: 0.9rem; }
  .btn-lg { height: 48px; padding: 0 var(--space-lg); font-size: 1rem; }

  /* --- Variant (Color) Modifiers --- */

  /* Primary Variant: Inviting, not aggressive. */
  .btn-primary {
    background-color: var(--color-accent);
    color: white;
  }
  .btn-primary:hover {
    background-color: var(--color-accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px hsl(var(--color-accent-hsl) / 0.2);
  }
  .btn-primary:disabled { background-color: var(--color-accent); opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  /* Secondary Variant: Clear, but doesn't compete with the primary. */
  .btn-secondary { background-color: var(--color-gray-100); color: var(--color-text); }
  .btn-secondary:hover { background-color: var(--color-gray-200); }
  .btn-secondary:disabled { background-color: var(--color-gray-100); opacity: 0.6; cursor: not-allowed; }

  /* Ghost Variant: Minimal, for low-priority actions. */
  .btn-ghost { background-color: transparent; color: var(--color-gray-500); font-weight: 500; }
  .btn-ghost:hover { background-color: var(--color-gray-100); color: var(--color-text); }
  .btn-ghost:disabled { background-color: transparent; opacity: 0.4; cursor: not-allowed; }

  /* --- Dark Mode Styles --- */
  @media (prefers-color-scheme: dark) {
    .btn-secondary { background-color: var(--color-gray-800); color: var(--color-text-dark); }
    .btn-secondary:hover { background-color: var(--color-gray-700); }
    .btn-ghost { color: var(--color-gray-400); }
    .btn-ghost:hover { background-color: var(--color-gray-800); color: var(--color-text-dark); }
  }
</style>
