<!-- src/lib/components/ui/CommandBar.svelte -->
<script lang="ts">
  // --- Svelte & Third-Party ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut, cubicOut } from 'svelte/easing';
  import type { TransitionConfig } from 'svelte/transition';
  import { t } from '$lib/utils/i18n';

  // --- UI Components & Modals ---
  import ApiKeyModal from '$lib/components/features/settings/ApiKeyModal.svelte';
  import ErrorDiagnosticModal from '$lib/components/features/diagnostics/ErrorDiagnosticModal.svelte';
  import StrategySessionModal from '$lib/components/ai/StrategySessionModal.svelte';
  // FIX: This path was likely intended to be relative to the `command-bar` folder.
  import PasswordModal from './PasswordModal.svelte';
  import Icon from '@ui/Icon.svelte';
  import Spinner from '@ui/Spinner.svelte';

  // --- Command Bar Views ---
  import MainView from './MainView.svelte';
  import SearchView from './SearchView.svelte';
  import AiView from './AiView.svelte';
  import VaultView from './VaultView.svelte';
  import FileExplorer from '@modules/file-system/ui/FileExplorer.svelte';
  import StudyHubView from './StudyHubView.svelte';
  // StatisticsView is lazy loaded
  import DeckOptionsView from './DeckOptionsView.svelte';

  // --- Stores & Services ---
  import {
    commandBarState,
    close as closeCommandBar,
    toggle as toggleCommandBar,
    goBack,
    // FIX: Import the missing action function.
    closeDiagnosticModal,
    closeSchemaModal,
  } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  
  import TextInputModal from '@ui/TextInputModal.svelte';

  // --- Local State ---
  let query = $state('');
  // REMOVED: let isApiKeyModalOpen = $state(false);
  let panelElement = $state<HTMLDivElement | null>(null);
  let searchInputElement = $state<HTMLInputElement | null>(null);
  let previouslyFocusedElement: HTMLElement | null = null;
  let searchViewInstance = $state<SearchView | null>(null);

  // --- Effects for Lifecycle and Side Effects ---

  $effect(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      const anyModalIsOpen =
        commandBarState.isApiKeyModalOpen ||
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
      
      // Check if we are on mobile to prevent auto-focusing and opening the keyboard
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      if (!isMobile) {
        setTimeout(() => searchInputElement?.focus(), 50);
      }
    } else {
      previouslyFocusedElement?.focus();
    }
  });

  // --- Event Handlers ---

  function handlePanelKeydown(event: KeyboardEvent) {
    // 1. Delegate to SearchView if active (query exists)
    if (query.trim().length > 0 && searchViewInstance) {
      searchViewInstance.handleKeyDown(event);
      return;
    }

    // 2. Handle Navigation for MainView / Other Views (when query is empty)
    if (query.trim().length === 0) {
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        
        const contentContainer = panelElement?.querySelector('.view-content');
        if (!contentContainer) return;

        const focusableSelector = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
        const focusableItems = Array.from(contentContainer.querySelectorAll(focusableSelector)) as HTMLElement[];
        
        if (focusableItems.length === 0) return;

        const currentFocus = document.activeElement as HTMLElement;
        const currentIndex = focusableItems.indexOf(currentFocus);

        if (event.key === 'ArrowDown') {
          if (currentFocus === searchInputElement) {
            // From Input to First Item
            focusableItems[0]?.focus();
          } else if (currentIndex !== -1) {
            // Next Item (Loop to first if at end, or stay at end? Let's loop)
            const nextIndex = (currentIndex + 1) % focusableItems.length;
            focusableItems[nextIndex]?.focus();
          }
        } else if (event.key === 'ArrowUp') {
          if (currentIndex !== -1) {
            if (currentIndex === 0) {
              // From First Item back to Input
              searchInputElement?.focus();
            } else {
              // Previous Item
              focusableItems[currentIndex - 1]?.focus();
            }
          } else if (currentFocus === searchInputElement) {
            // From Input to Last Item (Loop around)
            focusableItems[focusableItems.length - 1]?.focus();
          }
        }
        return;
      }
    }

    // 3. Global Escape handling
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
      easing: cubicOut, // Snappier
      css: (t: number, u: number) => `
        transform: ${transform} scale(${0.95 + t * 0.05}) translateY(${u * params.y}px);
        opacity: ${t};
      `,
    };
  };

  const responsiveTransition = (
    node: Element,
    params: FlyAndScaleParams
  ): TransitionConfig => {
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (isMobile) {
      return fly(node, { y: 100, duration: 250, easing: quintOut });
    }
    return flyAndScale(node, params);
  };

  // --- Modal Control Functions ---
  // REMOVED: function openApiKeyModal() ...
  // REMOVED: function closeApiKeyModal() ...
  import { closeApiKeyModal, openApiKeyModal } from '$lib/modules/command-bar/ui/commandBarStore.svelte';

</script>

<!-- All Modals are managed here for central control -->
<!-- FIX: Pass `onClose` as a prop, not an event handler. -->
<ApiKeyModal show={commandBarState.isApiKeyModalOpen} onClose={closeApiKeyModal} />

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
      const { closeSchemaModal } = await import('$lib/modules/command-bar/ui/commandBarStore.svelte');
      
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
    in:responsiveTransition={{ y: -20, duration: 250 }}
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
              <FileExplorer />
            {:else if commandBarState.currentView === 'study-hub'}
              <StudyHubView />
            {:else if commandBarState.currentView === 'statistics'}
              {#await import('./StatisticsView.svelte') then module}
                <module.default />
              {/await}
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
            bind:query={query}
            {openApiKeyModal}
          />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    all: unset;
    display: block;
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.2);
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
    
    /* Premium Glassmorphism */
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
    transition: box-shadow 0.3s ease;
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
      height: 75vh;
      max-height: 75vh;
    }
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--glass-border); /* Use glass border for consistency */
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.05);
  }

  .search-input {
    flex-grow: 1;
    border: none;
    background: none;
    font-size: var(--font-size-lg);
    color: var(--color-text);
    outline: none;
    padding: 0;
    font-weight: 500;
  }

  .search-input::placeholder {
    color: var(--color-text-secondary);
    font-weight: 400;
  }

  .view-content {
    flex-grow: 1;
    display: grid;
    grid-template-areas: "content";
    position: relative;
    padding: var(--space-sm);
    overflow: hidden;
  }

  .view-transition-wrapper {
    grid-area: content;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  /* Dark theme overrides are handled by variables, but we keep specific tweaks if needed */
  :global(.dark-theme) .input-wrapper {
    border-color: var(--glass-border);
  }
</style>
