<!--
  @component
  FirstTimeHint

  This component serves as a "micro-onboarding" element. It is displayed to the user
  once to teach them the keyboard shortcut for the CommandBar (e.g., Ctrl+K or Cmd+K).

  It is designed to be informative but not intrusive, floating at the bottom of the screen
  and allowing for easy dismissal.

  Key Features:
  - Appears with a smooth `fly` and `fade` transition.
  - Renders keyboard keys in a visually distinct style.
  - Can be dismissed by the user, triggering a `close` event.
  - Styled for both light and dark themes.

  Events:
  - `close`: Fired when the user clicks the close button, signaling that the hint should be hidden.
-->
<script lang="ts">
  // --- Svelte Core ---
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { t } from '$lib/utils/i18n';

  // --- UI Components ---
  import Icon from './Icon.svelte';

  const dispatch = createEventDispatcher();

  /**
   * Notifies the parent component that this hint should be closed.
   */
  function handleClose() {
    dispatch('close');
  }
</script>

<!-- 
  The main container for the hint. It uses transitions for a smooth appearance.
  The `in:fly` transition makes it slide up from the bottom, and `out:fade` makes it gently disappear.
-->
<div class="hint-container" in:fly={{ y: 20, duration: 400, easing: quintOut }} out:fade={{ duration: 200 }}>
  <p class="hint-text">
    <!-- The text is rendered using @html to allow for the <kbd> tags from the i18n string. -->
    {@html $t('first_time_hint.command_bar_hint')}
  </p>
  <button class="close-button" on:click={handleClose} aria-label={$t('first_time_hint.close_hint_aria_label')}>
    <Icon name="x" size={18} />
  </button>
</div>

<style>
  .hint-container {
    position: fixed;
    /* 
      The 60px offset provides space for other floating elements like the FAB.
      This prevents the hint from overlapping with primary actions.
    */
    bottom: calc(var(--space-lg) + 60px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 90; /* Above the main editor, but below other UI panels. */

    display: flex;
    align-items: center;
    gap: var(--space-md);

    background-color: var(--color-text);
    color: var(--color-background);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--space-sm);
    box-shadow: var(--shadow-lg);
  }

  .hint-text {
    margin: 0;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    white-space: nowrap; /* Prevents the text from wrapping to a new line. */
  }

  /* 
    Styling for the <kbd> (keyboard) element, which is globally applied when inside hint-text.
    This creates the visual appearance of a keyboard key.
  */
  :global(.hint-text kbd) {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-family: var(--font-main);
    font-size: 0.85rem;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-background);
    opacity: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-xs);
    border-radius: 50%;
    transition: opacity 0.2s, background-color 0.2s;
  }

  .close-button:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* --- Dark Mode Styles --- */
  @media (prefers-color-scheme: dark) {
    .hint-container {
      background-color: var(--color-text-dark);
      color: var(--color-background-dark);
    }

    :global(.hint-text kbd) {
      background-color: rgba(0, 0, 0, 0.1);
      border-color: rgba(0, 0, 0, 0.2);
    }

    .close-button {
      color: var(--color-background-dark);
    }

    .close-button:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }
</style>
