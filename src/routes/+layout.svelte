<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/core/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/modules/command-bar/ui/CommandBar.svelte';
  import NodeDetailPanel from '$lib/components/features/node-detail/NodeDetailPanel.svelte';
  import GlobalErrorBoundary from '$lib/core/ui/GlobalErrorBoundary.svelte';
  import AppInitializer from '$lib/core/app-shell/AppInitializer.svelte';
  import type { Snippet } from 'svelte';

  import { nodeDetailState } from '$lib/stores/nodeDetailStore.svelte';
  import { themeStore, _applyThemeToDOM } from '$lib/stores/themeStore.svelte';
  import * as errorService from '$lib/core/services/errorService';

  import '$lib/styles/app.css';
  import 'katex/dist/katex.min.css';

  let { children } = $props<{ children: Snippet }>();

  // --- APPLY THEME IMMEDIATELY TO PREVENT FOUC ---
  if (browser) {
    _applyThemeToDOM(themeStore.theme);
  }

  // --- GLOBAL ERROR STATE ---
  let hasError = $state(false);
  let capturedError = $state<unknown>(null);
  let isSafeMode = $state(false);

  // --- CRITICAL INFRASTRUCTURE SETUP ---
  onMount(async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch(console.error);
    }
    
    // Check Safe Mode
    isSafeMode = errorService.isSafeMode();
  });

  $effect(() => {
    // --- GLOBAL ERROR HANDLERS ---
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Global Error Caught]:', event.error);
      errorService.reportError(event.error, { source: 'window.onerror' });
      capturedError = event.error;
      hasError = true;
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection Caught]:', event.reason);
      errorService.reportError(event.reason, { source: 'unhandledrejection' });
      capturedError = event.reason;
      hasError = true;

    };

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  });

  function exitSafeMode() {
    errorService.setSafeMode(false);
    window.location.reload();
  }
</script>

{#if hasError}
  <GlobalErrorBoundary error={capturedError} />
{:else}
  <!-- 
    FIX: Added 'bg-background' and 'text-foreground' 
    This ensures the shell actually uses the theme colors defined in CSS variables.
  -->
  <div class="app-shell text-foreground">
    <AppInitializer />
    <Toaster position="bottom-center" />

    {#if isSafeMode}
      <div class="safe-mode-banner">
        <span>Running in Safe Mode. Some features are disabled.</span>
        <button onclick={exitSafeMode}>Exit Safe Mode</button>
      </div>
    {/if}

    <!-- 
      Ensure OrganicCanvas is positioned ABSOLUTE/FIXED in its own file, 
      or it will push the grid down.
    -->
    <OrganicCanvas />
    <CommandBar />

    <main 
      class="app-grid" 
      class:panel-open={nodeDetailState.isOpen}
      class:is-resizing={nodeDetailState.isResizing}
      style="grid-template-columns: 1fr {nodeDetailState.isOpen ? `min(${nodeDetailState.width}px, 90vw)` : '0px'}"
    >
      <div class="content-area">
        {@render children?.()}
      </div>
      <NodeDetailPanel />
    </main>
  </div>
{/if}

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    position: relative; /* Creates a positioning context for children if needed */
  }

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

  .app-grid {
    display: grid;
    height: 100%;
    width: 100%;
    grid-template-columns: 1fr 0px;
    transition: grid-template-columns 0.3s ease-in-out;
    overflow: hidden;
    position: relative;
    z-index: 1; /* Ensures content sits above the canvas */
  }



  .app-grid.is-resizing {
    transition: none !important;
  }

  .content-area {
    overflow: hidden;
    position: relative;
    height: 100%;
  }
</style>
