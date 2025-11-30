<script lang="ts">
  /**
   * @file +layout.svelte
   * @description
   * The root layout component for the SvelteKit application.
   * This component serves as the application shell, providing the fundamental structure
   * and shared state management for all pages.
   *
   * Responsibilities:
   * 1. **Infrastructure Initialization:** Sets up service workers, global error handling, and safe mode checks.
   * 2. **Theme Management:** Applies the user's selected theme (light/dark/system) to the DOM immediately to prevent FOUC (Flash of Unstyled Content).
   * 3. **Global UI Components:** Renders persistent UI elements like the `OrganicCanvas` background, `CommandBar`, `Toaster`, and the side `NodeDetailPanel`.
   * 4. **Layout Orchestration:** Manages the main responsive grid layout, handling the dynamic resizing of the side panel.
   * 5. **Error Boundary:** Wraps the entire application in a `GlobalErrorBoundary` to gracefully handle and report uncaught exceptions.
   */

  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/core/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/modules/command-bar/ui/CommandBar.svelte';
  import NodeDetailPanel from '$lib/modules/editor/ui/node-detail/NodeDetailPanel.svelte';
  import GlobalErrorBoundary from '$lib/core/ui/GlobalErrorBoundary.svelte';
  import AppInitializer from '$lib/core/app-shell/AppInitializer.svelte';

  import type { Snippet } from 'svelte';

  import { uiState } from '$lib/core/ui/uiStore.svelte';
  import { nodeDetailState } from '$lib/modules/editor/ui/nodeDetailStore.svelte';
  import {
    themeStore,
    _applyThemeToDOM,
  } from '$lib/modules/settings/ui/themeStore.svelte';
  import * as errorService from '$lib/core/services/errorService';

  // Import global styles
  import '$lib/styles/app.css';
  import 'katex/dist/katex.min.css';

  // Svelte 5 Snippets for slot content
  const { children } = $props<{ children: Snippet }>();

  // --- APPLY THEME IMMEDIATELY TO PREVENT FOUC ---
  // We access the theme store directly and apply it synchronously if in the browser.
  if (browser) {
    _applyThemeToDOM(themeStore.theme);
  }

  // --- GLOBAL ERROR STATE ---
  let hasError = $state(false);
  let capturedError = $state<unknown>(null);
  let isSafeMode = $state(false);

  // --- CRITICAL INFRASTRUCTURE SETUP ---
  onMount(async () => {
    // Register Service Worker for offline capabilities (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch(console.error);
    }

    // Check if the app is currently running in Safe Mode (usually due to a crash loop)
    isSafeMode = errorService.isSafeMode();
  });

  // Effect to register global error listeners
  $effect(() => {
    // --- GLOBAL ERROR HANDLERS ---

    /**
     * Handles uncaught runtime errors.
     */
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Global Error Caught]:', event.error);
      errorService.reportError(event.error, { source: 'window.onerror' });
      capturedError = event.error;
      hasError = true;
    };

    /**
     * Handles unhandled Promise rejections.
     */
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection Caught]:', event.reason);
      errorService.reportError(event.reason, { source: 'unhandledrejection' });
      capturedError = event.reason;
      hasError = true;
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  });

  /**
   * Action to disable safe mode and reload the application, attempting a normal start.
   */
  function exitSafeMode() {
    errorService.setSafeMode(false);
    window.location.reload();
  }
</script>

{#if hasError}
  <!-- If a critical global error occurs, replace the entire UI with the error boundary -->
  <GlobalErrorBoundary error={capturedError} />
{:else}
  <!-- 
    Main Application Shell
    The 'text-foreground' class ensures the shell inherits the correct text color
    from the theme variables.
  -->
  <div class="app-shell text-foreground">
    <!-- Non-visual initializer component for app-wide logic -->
    <AppInitializer />

    <!-- Toast notification container -->
    <Toaster position="bottom-center" />



    {#if isSafeMode}
      <div class="safe-mode-banner">
        <span>Running in Safe Mode. Some features are disabled.</span>
        <button onclick={exitSafeMode}>Exit Safe Mode</button>
      </div>
    {/if}

    <!-- 
      Organic Canvas Background
      Positioned absolutely (via CSS) to sit behind all content.
    -->
    <OrganicCanvas />

    <!--
      Command Bar (Spotlight-like search)
      Ideally hidden until toggled by the user.
    -->
    <CommandBar />

    <!--
      Main Layout Grid
      Dynamically adjusts columns to accommodate the side panel (NodeDetailPanel).
      The inline style handles the smooth transition of the panel width.
    -->
    <!--
      Main Layout Switch
      Renders either the Standard App Grid or the Immersive Layer.
      This ensures better performance by unmounting the unused view.
    -->
    <main
        class="app-grid"
        class:panel-open={nodeDetailState.isOpen}
        class:is-resizing={nodeDetailState.isResizing}
        style="grid-template-columns: 1fr {nodeDetailState.isOpen
          ? `min(${nodeDetailState.width}px, 90vw)`
          : '0px'}"
      >
        <!-- The main content area where pages are rendered -->
        <div class="content-area">
          {@render children?.()}
        </div>

        <!-- The collapsible side panel -->
        <NodeDetailPanel />
      </main>
  </div>
{/if}

<style>
  /* Root shell container */
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    position: relative; /* Creates a positioning context for children if needed */
  }

  /* Warning banner for Safe Mode */
  .safe-mode-banner {
    background-color: var(--color-warning);
    color: var(--color-text-on-warning, black);
    padding: var(--space-xs) var(--space-md);
    text-align: center;
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-md);
    z-index: 9999;
  }

  .safe-mode-banner button {
    background: rgba(0, 0, 0, 0.1);
    border: none;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 700;
  }

  /*
    The primary grid layout.
    Uses CSS Grid to manage the split between the main content and the side panel.
  */
  .app-grid {
    display: grid;
    height: 100%;
    width: 100%;
    /* Default state: 1 column (content), 0 width for panel */
    grid-template-columns: 1fr 0px;
    /* Smooth transition for opening/closing */
    transition: grid-template-columns 0.3s ease-in-out;
    overflow: hidden;
    position: relative;
    z-index: 1; /* Ensures content sits above the canvas */
  }

  /* Disable transitions while resizing to prevent lag */
  .app-grid.is-resizing {
    transition: none !important;
  }

  .content-area {
    overflow: hidden;
    position: relative;
    height: 100%;
  }
</style>
