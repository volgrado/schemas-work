<!--
  @component
  AppHeader

  The main application header, which is fixed at the top of the viewport.
  It provides a responsive layout with three sections.

  - The left section contains the brand logo and name.
  - The center section is a slot for contextual action buttons.
  - The right section contains the language switcher and theme toggle.

  On small screens, text labels next to icons are hidden to save space.
  Text-only buttons remain visible.

  Props:
  - `show`: {boolean} - Controls the visibility of the header.

  Events:
  - `showWelcome`: Fired when the user clicks the brand logo/name.

  Slots:
  - `default`: Content to be placed in the center section of the header.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  // --- UI Components & Utilities ---
  import Logo from '$lib/components/ui/Logo.svelte';
  import { t } from '$lib/utils/i18n';
  import LanguageSwitcher from '$lib/components/layout/LanguageSwitcher.svelte';
  import ThemeToggleButton from '$lib/components/ui/ThemeToggleButton.svelte';
  // --- MODIFICATION: Import documentStore to check for an active document ---
  import { documentStore } from '$lib/stores/documentStore';
  // --- MODIFICATION: Import stores to reset app state ---
  import { ttsStore } from '$lib/stores/ttsStore';
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import { reviewStore } from '$lib/stores/reviewStore';

  const dispatch = createEventDispatcher<{ showWelcome: void }>();
  /**
   * @prop {boolean} show - Controls the visibility of the header.
   */
  export let show: boolean = false;

  /**
   * Dispatches the 'showWelcome' event to the parent component.
   */
  function showWelcome() {
    documentStore.closeDocument();
    ttsStore.stopReading();
    cardEditorStore.close();
    reviewStore.finishReview();
    dispatch('showWelcome');
  }

  /** @props {string} class - Allows passing a custom CSS class from the parent.
   */
  let className = '';
  export { className as class };
</script>

<!-- MODIFICATION: Only show the header if the 'show' prop is true AND a document is loaded. -->
{#if show && $documentStore.docId}
  <header class="app-header {className}" transition:fade={{ duration: 300 }}>
    <div class="header-content">
      <div class="header-section left">
        <button
          class="brand-button"
          on:click={showWelcome}
          aria-label={$t('appHeader.aria.returnToWelcome')}
        >
          <div class="logo-wrapper"><Logo size={28} /></div>
          <h1 class="brand-name">
            Schemas<span class="accent-word">.Work</span>
          </h1>
        </button>
      </div>

      <div class="header-section center">
        <slot />
      </div>

      <div class="header-section right">
        <LanguageSwitcher />
        <ThemeToggleButton />
      </div>
    </div>
  </header>
{/if}

<style>
  .app-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 50;
    background-color: var(--color-background-translucent);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-sm) 0;
    transition: all 0.3s ease;
  }

  .header-content {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 var(--space-md);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    height: 36px; /* Fixed height for consistency */
  }

  /* --- 3-Column Structure --- */
  .header-section {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .header-section.left {
    justify-content: flex-start;
  }
  .header-section.center {
    justify-content: center;
    /* This prevents the center column from disappearing if its content is too wide */
    min-width: 0;
  }
  .header-section.right {
    justify-content: flex-end;
  }

  /* --- Brand Styles --- */
  .brand-button {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--space-sm);
    transition: background-color 0.2s ease;
    color: var(--color-text);
  }
  .brand-button:hover {
    background-color: var(--color-gray-100);
  }
  .logo-wrapper {
    display: grid;
    place-items: center;
    transition: transform 0.3s ease;
  }
  .brand-button:hover .logo-wrapper {
    transform: rotate(-15deg) scale(1.1);
  }
  .brand-name {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
    letter-spacing: -0.03em;
  }
  .accent-word {
    color: var(--color-accent);
  }

  /* --- Responsive Adjustments for Small Screens --- */
  @media (max-width: 600px) {
    .brand-name,
    /* THE FIX: This selector now only hides the <span> if it's a direct sibling following an <svg> */
    :global(.header-section .btn > svg + span) {
      display: none;
    }
    .brand-button {
      gap: 0; /* Remove gap when text is hidden */
    }
    .header-content {
      padding: 0 var(--space-sm);
    }
    .header-section.center,
    .header-section.right {
      gap: var(--space-xs); /* Reduce gap between controls */
    }
    /* Ensure icon-only buttons don't have extra padding */
    :global(.header-section .btn) {
      padding: 0 var(--space-sm);
    }
  }

  /* --- Dark Mode --- */
  :global(.dark-theme) .app-header {
    border-bottom-color: var(--color-border-dark);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  :global(.dark-theme) .brand-button:hover {
    background-color: var(--color-gray-800);
  }
</style>
