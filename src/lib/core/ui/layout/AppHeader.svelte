<!--
  @component
  AppHeader

  @description
  The responsive navigation bar that persists at the top of the active workspace.

  Features:
  - **Branding:** Displays the logo and app name (clickable to return home).
  - **Slots:** A central slot for context-specific actions (injected by `MainApp`).
  - **Global Controls:** Always shows Language and Theme toggles on the right.
  - **Context Awareness:** Only renders when a document is active (`documentState.docId`).
  - **State Cleanup:** `showWelcome` utility ensures a clean reset when navigating home.

  @props
  - `show` (boolean): Animation trigger.
  - `onShowWelcome` (function): Callback to return to the landing page.
  - `children` (snippet): Slot for dynamic center actions.
-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Snippet } from 'svelte';

  // --- UI Components & Utilities ---
  import Logo from '$lib/core/ui/Logo.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
  import LanguageSwitcher from '$lib/core/ui/layout/LanguageSwitcher.svelte';
  import ThemeToggleButton from '$lib/core/ui/ThemeToggleButton.svelte';

  // --- Stores ---
  import {
    documentState,
    close as closeDocument,
  } from '$lib/modules/editor/ui/documentStore.svelte';
  import { stopReading } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { close as closeCardEditor } from '$lib/modules/editor/ui/cardEditorStore.svelte';
  import { finishReview } from '$lib/modules/study/ui/reviewStore.svelte';

  const {
    children,
    onShowWelcome,
    class: className = '',
    show,
    forceVisible = false,
  } = $props<{
    show?: boolean;
    forceVisible?: boolean;
    class?: string;
    children: Snippet;
    onShowWelcome?: () => void;
  }>();

  /**
   * Resets all relevant app states (TTS, Editor, Review) and navigates to the Welcome screen.
   */
  function showWelcome() {
    closeDocument();
    stopReading();
    closeCardEditor();
    finishReview();
    onShowWelcome?.();
  }
</script>

<!-- Header is only visible when a document is active or forced -->
{#if show && (documentState.docId || forceVisible)}
  <header class="app-header {className}" transition:fade={{ duration: 300 }}>
    <div class="header-content">
      <!-- Left: Brand / Home -->
      <div class="header-section left">
        <button
          class="brand-button"
          onclick={showWelcome}
          aria-label={i18n.t('appHeader.aria.returnToWelcome')}
        >
          <div class="logo-wrapper"><Logo size={24} /></div>
          <h1 class="brand-name">
            Schemas<span class="accent-word">.Work</span>
          </h1>
        </button>
      </div>

      <!-- Center: Dynamic Actions (Editor controls, etc.) -->
      <div class="header-section center">
        {@render children?.()}
      </div>

      <!-- Right: Global Preferences -->
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
    z-index: var(--z-header);
    background-color: var(--color-background-translucent);
    border-bottom: 1px solid var(--color-border);
    padding: 0;
    transition: all 0.3s ease;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    height: var(--height-header);
    display: flex;
    align-items: center;
  }

  .header-content {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: 0 var(--space-md);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    height: 100%;
  }

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
    min-width: 0;
  }
  .header-section.right {
    justify-content: flex-end;
  }

  .brand-button {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
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
    font-size: var(--font-size-xl);
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
    letter-spacing: -0.03em;
  }
  .accent-word {
    color: var(--color-accent);
  }

  /* Mobile adjustments */
  @media (max-width: 640px) {
    .brand-name,
    :global(.header-section .btn > svg + span) {
      display: none; /* Hide text labels on small screens */
    }
    .brand-button {
      gap: 0;
    }
    .header-content {
      padding: 0 var(--space-sm);
    }
    .header-section.center,
    .header-section.right {
      gap: var(--space-xs);
    }
    :global(.header-section .btn) {
      padding: 0 var(--space-sm);
    }
  }
</style>
