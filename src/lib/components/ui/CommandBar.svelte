<!-- src/lib/components/ui/CommandBar.svelte -->
<script lang="ts">
  // --- Svelte & Third-Party ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import type { TransitionConfig } from 'svelte/transition';
  import { t } from '$lib/utils/i18n';

  // --- UI Components & Modals ---
  import ApiKeyModal from '$lib/components/ui/ApiKeyModal.svelte';
  import ErrorDiagnosticModal from '$lib/components/ui/ErrorDiagnosticModal.svelte';
  import StrategySessionModal from '$lib/components/ai/StrategySessionModal.svelte';
  // FIX: This path was likely intended to be relative to the `command-bar` folder.
  import PasswordModal from './command-bar/PasswordModal.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // --- Command Bar Views ---
  import MainView from './command-bar/MainView.svelte';
  import SearchView from './command-bar/SearchView.svelte';
  import AiView from './command-bar/AiView.svelte';
  import VaultView from './command-bar/VaultView.svelte';
  import FileExplorerView from './command-bar/FileExplorerView.svelte';
  import StudyHubView from './command-bar/StudyHubView.svelte';
  import StatisticsView from './command-bar/StatisticsView.svelte';
  import DeckOptionsView from './command-bar/DeckOptionsView.svelte';

  // --- Stores & Services ---
  import {
    commandBarState,
    close as closeCommandBar,
    toggle as toggleCommandBar,
    goBack,
    // FIX: Import the missing action function.
    closeDiagnosticModal,
  } from '$lib/stores/commandBarStore.svelte';

  // --- Local State ---
  let query = $state('');
  let isApiKeyModalOpen = $state(false);
  let panelElement = $state<HTMLDivElement | null>(null);
  let searchInputElement = $state<HTMLInputElement | null>(null);
  let previouslyFocusedElement: HTMLElement | null = null;
  let searchViewInstance = $state<SearchView | null>(null);

  // --- Effects for Lifecycle and Side Effects ---

  $effect(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      const anyModalIsOpen =
        isApiKeyModalOpen ||
        commandBarState.isDiagnosticModalOpen ||
        commandBarState.isStrategySessionOpen ||
        commandBarState.isPasswordModalOpen;

      if (anyModalIsOpen) return;

      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleCommandBar();
      }
    };

    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  });

  $effect(() => {
    if (commandBarState.isOpen) {
      previouslyFocusedElement = document.activeElement as HTMLElement;
      query = '';
      setTimeout(() => searchInputElement?.focus(), 50);
    } else {
      previouslyFocusedElement?.focus();
    }
  });

  // --- Event Handlers ---

  function handlePanelKeydown(event: KeyboardEvent) {
    if (query.trim().length > 0 && searchViewInstance) {
      searchViewInstance.handleKeyDown(event);
      return;
    }

    if (event.key === 'Escape') {
      if (commandBarState.currentView !== 'main') {
        event.preventDefault();
        goBack();
      } else {
        closeCommandBar();
      }
    }
  }

  // --- Transitions ---
  type FlyAndScaleParams = { y: number; duration: number };

  const flyAndScale = (
    node: Element,
    params: FlyAndScaleParams
  ): TransitionConfig => {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;
    return {
      ...params,
      easing: quintOut,
      css: (t: number, u: number) => `
        transform: ${transform} scale(${1 - u * 0.05}) translateY(${u * params.y}px);
        opacity: ${t};
      `,
    };
  };

  // --- Modal Control Functions ---
  function openApiKeyModal() {
    isApiKeyModalOpen = true;
    closeCommandBar();
  }
  function closeApiKeyModal() {
    isApiKeyModalOpen = false;
  }
</script>

<!-- All Modals are managed here for central control -->
<!-- FIX: Pass `onClose` as a prop, not an event handler. -->
<ApiKeyModal show={isApiKeyModalOpen} onClose={closeApiKeyModal} />

<ErrorDiagnosticModal
  show={commandBarState.isDiagnosticModalOpen}
  onClose={closeDiagnosticModal}
/>

<StrategySessionModal show={commandBarState.isStrategySessionOpen} />

<PasswordModal bind:show={commandBarState.isPasswordModalOpen} />

<!-- Main CommandBar UI -->
{#if commandBarState.isOpen}
  <!-- FIX: Use a styled <button> for the overlay for better accessibility. -->
  <button
    class="overlay"
    onclick={closeCommandBar}
    transition:fade={{ duration: 150 }}
    aria-label={$t('command_bar.close_aria_label')}
  ></button>

  <div
    class="panel"
    bind:this={panelElement}
    in:flyAndScale={{ y: -20, duration: 250 }}
    out:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-label={$t('command_bar.title')}
    tabindex="-1"
    onkeydown={handlePanelKeydown}
  >
    <!-- Persistent Search Input -->
    <div class="input-wrapper">
      <Icon name="search" size={20} />
      <input
        type="text"
        bind:value={query}
        placeholder={$t('command.search_vault')}
        class="search-input"
        aria-label={$t('command.search_vault')}
        bind:this={searchInputElement}
      />
      {#if searchViewInstance?.status === 'loading'}
        <div class="spinner" aria-label="Loading search results"></div>
      {/if}
    </div>

    <!-- Dynamic View Area -->
    <div class="view-content">
      {#if query.trim().length === 0}
        <!-- The View Router with Transitions -->
        {#key commandBarState.currentView}
          <div
            class="view-transition-wrapper"
            in:fly={{
              x: commandBarState.isNavigatingBack ? -15 : 15,
              duration: 250,
              easing: quintOut,
            }}
            out:fade={{ duration: 100 }}
          >
            {#if commandBarState.currentView === 'main'}
              <MainView {openApiKeyModal} />
            {:else if commandBarState.currentView === 'ai-actions'}
              <AiView />
              <!-- FIX: Corrected typo from `commandBarV5State` to `commandBarState`. -->
            {:else if commandBarState.currentView === 'vault'}
              <VaultView />
            {:else if commandBarState.currentView === 'file-explorer'}
              <FileExplorerView />
            {:else if commandBarState.currentView === 'study-hub'}
              <StudyHubView />
            {:else if commandBarState.currentView === 'statistics'}
              <StatisticsView />
            {:else if commandBarState.currentView === 'deck-options' && commandBarState.viewPayload}
              <DeckOptionsView deckId={commandBarState.viewPayload.deckId} />
            {/if}
          </div>
        {/key}
      {:else}
        <!-- Search Results (Query Exists) -->
        <div
          class="view-transition-wrapper"
          transition:fade={{ duration: 150 }}
        >
          <SearchView
            bind:this={searchViewInstance}
            {query}
            {openApiKeyModal}
          />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* FIX: Reset button styles for the overlay to make it behave like a div. */
  .overlay {
    all: unset; /* Remove all default button styling */
    display: block; /* Ensure it covers the screen */
    position: fixed;
    inset: 0;
    background-color: var(--overlay-bg, rgba(0, 0, 0, 0.6));
    z-index: calc(var(--z-command-bar, 100) - 1);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }
  .panel {
    position: fixed;
    top: 15%;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 640px;
    max-height: 70vh;
    background-color: var(
      --color-background-translucent,
      rgba(255, 255, 255, 0.8)
    );
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: 16px;
    box-shadow: var(
      --shadow-xl,
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04)
    );
    z-index: var(--z-command-bar, 100);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    outline: none;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--color-border, #e0e0e0);
    flex-shrink: 0;
  }
  .search-input {
    flex-grow: 1;
    border: none;
    background: none;
    font-size: 1rem;
    color: var(--color-text, #111);
    outline: none;
  }
  .search-input::placeholder {
    color: var(--color-text-muted, #999);
  }
  .view-content {
    flex-grow: 1;
    overflow: auto;
    position: relative;
    padding: var(--space-xs, 8px);
  }
  .view-transition-wrapper {
    width: 100%;
    height: 100%;
  }
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-accent, blue);
    border-bottom-color: transparent;
    border-radius: 50%;
    animation: rotation 1s linear infinite;
  }
  @keyframes rotation {
    to {
      transform: rotate(360deg);
    }
  }
  :global(.dark-theme) .panel {
    background-color: var(--panel-bg-dark, rgba(30, 30, 30, 0.8));
    border-color: var(--panel-border-dark, #444);
  }
  :global(.dark-theme) .input-wrapper {
    border-color: var(--panel-border-dark, #444);
  }
  :global(.dark-theme) .search-input {
    color: var(--color-text-dark, #eee);
  }
</style>
