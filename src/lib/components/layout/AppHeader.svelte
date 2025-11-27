<!-- src/lib/components/layout/AppHeader.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { Snippet } from 'svelte';

  // --- UI Components & Utilities ---
  import Logo from '$lib/core/ui/Logo.svelte';
  import { t } from '$lib/utils/i18n';
  import LanguageSwitcher from '$lib/components/layout/LanguageSwitcher.svelte';
  import ThemeToggleButton from '$lib/core/ui/ThemeToggleButton.svelte';

  // VVVV CORRECTED IMPORTS VVVV
  import {
    documentState,
    close as closeDocument,
  } from '$lib/stores/documentStore.svelte';
  import { stopReading } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { close as closeCardEditor } from '$lib/modules/editor/ui/cardEditorStore.svelte';
  import { finishReview } from '$lib/stores/reviewStore.svelte';

  let {
    show = false,
    class: className = '',
    children,
  } = $props<{
    show?: boolean;
    class?: string;
    children: Snippet;
  }>();

  const dispatch = createEventDispatcher<{ showWelcome: void }>();

  /**
   * Resets all relevant app states and dispatches the 'showWelcome' event.
   */
  function showWelcome() {
    // VVVV CORRECTED METHOD CALL VVVV
    closeDocument();
    stopReading();
    closeCardEditor();
    finishReview();
    dispatch('showWelcome');
  }
</script>

<!-- VVVV CORRECTED STATE ACCESS VVVV -->
{#if show && documentState.docId}
  <header class="app-header {className}" transition:fade={{ duration: 300 }}>
    <div class="header-content">
      <div class="header-section left">
        <button
          class="brand-button"
          onclick={showWelcome}
          aria-label={$t('appHeader.aria.returnToWelcome')}
        >
          <div class="logo-wrapper"><Logo size={24} /></div>
          <h1 class="brand-name">
            Schemas<span class="accent-word">.Work</span>
          </h1>
        </button>
      </div>

      <div class="header-section center">
        {@render children?.()}
      </div>

      <div class="header-section right">
        <LanguageSwitcher />
        <ThemeToggleButton />
      </div>
    </div>
  </header>
{/if}

<style>
  /* All styles are unchanged and correct */
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

  @media (max-width: 640px) {
    .brand-name,
    :global(.header-section .btn > svg + span) {
      display: none;
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
