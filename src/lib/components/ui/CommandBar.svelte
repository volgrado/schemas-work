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
  import Spinner from '$lib/components/ui/Spinner.svelte';

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
    closeSchemaModal,
  } from '$lib/stores/commandBarStore.svelte';
  
  import TextInputModal from '$lib/components/ui/TextInputModal.svelte';

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

<StrategySessionModal bind:show={commandBarState.isStrategySessionOpen} />

<PasswordModal bind:show={commandBarState.isPasswordModalOpen} />

<!-- Schema Creation Modal (for Onboarding Demo & General Use) -->
{#if commandBarState.isSchemaModalOpen}
  <TextInputModal
    show={commandBarState.isSchemaModalOpen}
    title={$t('command.new_schema')}
    placeholder={$t('file_explorer.default_schema_name')}
    submitLabel={$t('common.create')}
    onClose={closeSchemaModal}
    onsubmit={async (name) => {
      // Import dynamically to avoid circular deps if needed, or just use the store
      const { create } = await import('$lib/stores/documentStore.svelte');
      const { closeSchemaModal } = await import('$lib/stores/commandBarStore.svelte');
      
      await create(name);
      closeSchemaModal();
    }}
  />
{/if}

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
        <Spinner size="sm" />
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
  /* FIX: Reset button styles for the overlay to make it behave like a div. */
  .overlay {
    all: unset; /* Remove all default button styling */
    display: block; /* Ensure it covers the screen */
    position: fixed;
    inset: 0;
    background-color: var(--overlay-bg);
    z-index: calc(var(--z-command-bar) - 1);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    transition: opacity var(--duration-base) var(--ease-out);
  }
  .panel {
    position: fixed;
    top: 15%;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 640px;
    max-height: 70vh;
    
    /* Glassmorphism */
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    
    border-radius: var(--radius-xl);
    z-index: var(--z-command-bar);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    outline: none;
  }

  /* Mobile: slide from bottom like phone apps */
  @media (max-width: 640px) {
    .panel {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      transform: none;
      width: 100%;
      max-width: 100%;
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      max-height: 85vh;
    }
  }
  .input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .search-input {
    flex-grow: 1;
    border: none;
    background: none;
    font-size: var(--font-size-lg);
    color: var(--color-text);
    outline: none;
    padding: 0;
  }
  .search-input::placeholder {
    color: var(--color-text-secondary);
  }
  .view-content {
    flex-grow: 1;
    overflow: auto;
    position: relative;
    padding: var(--space-sm);
  }
  .view-transition-wrapper {
    width: 100%;
    height: 100%;
  }
  :global(.dark-theme) .panel {
    background: var(--glass-bg);
    border-color: var(--glass-border);
  }
  :global(.dark-theme) .input-wrapper {
    border-color: var(--color-border);
  }
  :global(.dark-theme) .search-input {
    color: var(--color-text);
  }
</style>
