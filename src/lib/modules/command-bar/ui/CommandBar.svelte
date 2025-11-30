<!--
  @component
  CommandBar

  @description
  A powerful, Spotlight-style command interface that serves as the central navigation and action hub.
  It provides a unified entry point for:
  - **Navigation:** Switching between documents, folders, and application views (Study Hub, Vault).
  - **Search:** Semantic search across all content (using the Neural Index) and commands.
  - **Actions:** Executing global commands like "New Schema" or "Read Aloud".
  - **AI Tools:** Accessing AI-powered generation and refinement flows.

  Features:
  - **Global Shortcut:** Toggle with `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux).
  - **State Management:** Uses `commandBarStore.svelte.ts` to manage visibility and view stack.
  - **View Routing:** Dynamically renders sub-views (`MainView`, `SearchView`, `FileExplorer`) based on state.
  - **Keyboard Navigation:** Full support for Arrow keys and Escape for rapid interaction.
  - **Responsive Design:** Modals slide up from the bottom on mobile, fly in on desktop.
-->
<script lang="ts">
  // --- Svelte & Third-Party ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut, cubicOut } from 'svelte/easing';
  import type { TransitionConfig } from 'svelte/transition';
  import { i18n } from '$lib/utils/i18n.svelte';

  // --- UI Components & Modals ---
  import ApiKeyModal from '$lib/modules/settings/ui/ApiKeyModal.svelte';
  import ErrorDiagnosticModal from '$lib/modules/diagnostics/ui/ErrorDiagnosticModal.svelte';
  import StrategySessionModal from '$lib/modules/ai/ui/StrategySessionModal.svelte';
  import PasswordModal from './PasswordModal.svelte';
  import Icon from '$lib/core/ui/Icon.svelte'; // Corrected absolute import
  import Spinner from '$lib/core/ui/Spinner.svelte'; // Corrected absolute import

  // --- Command Bar Views ---
  import MainView from './MainView.svelte';
  import SearchView from './SearchView.svelte';
  import AiView from './AiView.svelte';
  import VaultView from './VaultView.svelte';
  import FileExplorer from '$lib/modules/file-system/ui/FileExplorer.svelte'; // Corrected absolute import
  import StudyHubView from './StudyHubView.svelte';
  // StatisticsView is lazy loaded to reduce initial bundle size
  import DeckOptionsView from './DeckOptionsView.svelte';


  // --- Stores & Services ---
  import {
    commandBarState,
    close as closeCommandBar,
    toggle as toggleCommandBar,
    goBack,
    closeDiagnosticModal,
    closeSchemaModal,
    closeApiKeyModal,
    openApiKeyModal,
  } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { create as createDocument } from '$lib/modules/editor/ui/documentStore.svelte';

  import TextInputModal from '$lib/core/ui/TextInputModal.svelte'; // Corrected absolute import

  // --- Local State ---
  let query = $state('');
  let panelElement = $state<HTMLDivElement | null>(null);
  let searchInputElement = $state<HTMLInputElement | null>(null);
  let previouslyFocusedElement: HTMLElement | null = null;
  let searchViewInstance = $state<SearchView | null>(null);

  async function handleCreateSchema(name: string) {
    await createDocument(name);
    closeSchemaModal();
    closeCommandBar();
  }

  // --- Effects for Lifecycle and Side Effects ---

  // Effect: Register global keyboard shortcut (Cmd+K / Ctrl+K)
  $effect(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      // Disable global toggle if another modal is already open to prevent stacking issues
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

  // Effect: Manage focus and input state when opening/closing
  $effect(() => {
    if (commandBarState.isOpen) {
      // Save current focus to restore later
      previouslyFocusedElement = document.activeElement as HTMLElement;
      query = '';

      // Check if we are on mobile to prevent auto-focusing and opening the keyboard
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      if (!isMobile) {
        setTimeout(() => searchInputElement?.focus(), 50);
      }
    } else {
      // Restore focus
      previouslyFocusedElement?.focus();
    }
  });

  // --- Event Handlers ---

  /**
   * Handles keyboard navigation within the command bar.
   * Delegates to specific views (like Search) or handles generic arrow navigation.
   */
  function handlePanelKeydown(event: KeyboardEvent) {
    // 1. Delegate to SearchView logic if searching (active query)
    if (query.trim().length > 0 && searchViewInstance) {
      searchViewInstance.handleKeyDown(event);
      return;
    }

    // 2. Handle List Navigation for MainView / Other Views (when query is empty)
    if (query.trim().length === 0) {
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();

        const contentContainer = panelElement?.querySelector('.view-content');
        if (!contentContainer) return;

        // Find all interactive elements in the current view
        const focusableSelector =
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
        const focusableItems = Array.from(
          contentContainer.querySelectorAll(focusableSelector)
        ) as HTMLElement[];

        if (focusableItems.length === 0) return;

        const currentFocus = document.activeElement as HTMLElement;
        const currentIndex = focusableItems.indexOf(currentFocus);

        if (event.key === 'ArrowDown') {
          if (currentFocus === searchInputElement) {
            // From Input -> First Item
            focusableItems[0]?.focus();
          } else if (currentIndex !== -1) {
            // Item -> Next Item (Looping)
            const nextIndex = (currentIndex + 1) % focusableItems.length;
            focusableItems[nextIndex]?.focus();
          }
        } else if (event.key === 'ArrowUp') {
          if (currentIndex !== -1) {
            if (currentIndex === 0) {
              // First Item -> Back to Input
              searchInputElement?.focus();
            } else {
              // Item -> Previous Item
              focusableItems[currentIndex - 1]?.focus();
            }
          } else if (currentFocus === searchInputElement) {
            // Input -> Last Item (Loop around)
            focusableItems[focusableItems.length - 1]?.focus();
          }
        }
        return;
      }
    }

    // 3. Global Escape handling (Back vs. Close)
    if (event.key === 'Escape') {
      if (commandBarState.currentView !== 'main') {
        event.preventDefault();
        goBack(); // Pop view stack
      } else {
        closeCommandBar(); // Close entirely
      }
    }
  }

  // --- Transitions ---
  type FlyAndScaleParams = { y: number; duration: number };

  /** Custom transition for desktop: fly + scale */
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

  /** Responsive transition chooser */
  const responsiveTransition = (
    node: Element,
    params: FlyAndScaleParams
  ): TransitionConfig => {
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (isMobile) {
      // Slide up from bottom on mobile
      return fly(node, { y: 100, duration: 250, easing: quintOut });
    }
    return flyAndScale(node, params);
  };
</script>

<!-- Global Modals Managed by Command Bar -->
<ApiKeyModal
  show={commandBarState.isApiKeyModalOpen}
  onClose={closeApiKeyModal}
  initialTab={commandBarState.apiKeyModalInitialTab}
/>

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
    title={i18n.t('command.new_schema')}
    onClose={closeSchemaModal}
    onsubmit={handleCreateSchema}
  />
{/if}

<!-- Main CommandBar UI -->
{#if commandBarState.isOpen}
  <!-- Overlay Backdrop -->
  <button
    class="overlay"
    onclick={closeCommandBar}
    transition:fade={{ duration: 150 }}
    aria-label={i18n.t('command_bar.close_aria_label')}
  ></button>

  <!-- Main Panel Container -->
  <div
    class="panel"
    bind:this={panelElement}
    in:responsiveTransition={{ y: -20, duration: 250 }}
    out:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-label={i18n.t('command_bar.title')}
    tabindex="-1"
    onkeydown={handlePanelKeydown}
  >
    <!-- Persistent Search Input Header -->
    <div class="input-wrapper">
      <Icon name="search" size={20} />
      <input
        type="text"
        bind:value={query}
        placeholder={i18n.t('command.search_vault')}
        class="search-input"
        aria-label={i18n.t('command.search_vault')}
        bind:this={searchInputElement}
      />
      {#if searchViewInstance?.status === 'loading'}
        <Spinner size="sm" />
      {/if}
    </div>

    <!-- Dynamic Content Area -->
    <div class="view-content">
      {#if query.trim().length === 0}
        <!-- ROUTER: Render active view from state stack -->
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
            {:else if commandBarState.currentView === 'deck-options' && commandBarState.viewPayload}
              <DeckOptionsView deckId={commandBarState.viewPayload.deckId} />
            {/if}
          </div>
        {/key}
      {:else}
        <!-- Search Results View (Active when typing) -->
        <div
          class="view-transition-wrapper"
          transition:fade={{ duration: 150 }}
        >
          <SearchView
            bind:this={searchViewInstance}
            bind:query
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
    border-bottom: 1px solid var(--glass-border);
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
    grid-template-areas: 'content';
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

  /* Dark theme overrides are handled by variables */
  :global(.dark-theme) .input-wrapper {
    border-color: var(--glass-border);
  }
</style>
