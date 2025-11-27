<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/core/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/modules/command-bar/ui/CommandBar.svelte';
  import NodeDetailPanel from '$lib/components/features/node-detail/NodeDetailPanel.svelte';
  import GlobalErrorBoundary from '$lib/core/ui/GlobalErrorBoundary.svelte';
  import type { Snippet } from 'svelte';

  import { nodeDetailState } from '$lib/stores/nodeDetailStore.svelte';

  // --- RESTORED IMPORTS ---
  import { themeStore, _applyThemeToDOM } from '$lib/stores/themeStore.svelte';
  import { initialize as initializeTts } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { settingsState } from '$lib/stores/settingsStore.svelte';
  import { initializeDocumentStoreListeners } from '$lib/stores/documentStore.svelte';
  import { initializeReviewStoreListeners } from '$lib/stores/reviewStore.svelte';
  import * as errorService from '$lib/core/services/errorService';
  import { initializeIcons } from '$lib/services/iconService'; // NEW
  import { registerCommandBarActions } from '$lib/init'; // NEW

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
  let isSafeMode = $state(false); // NEW

  // --- RESTORED LOGIC ---
  // Without this, your theme and stores will never load!
  onMount(async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch(console.error);
    }
    
    // NEW: Check Safe Mode
    isSafeMode = errorService.isSafeMode();

    // NEW: Run Integrity Check
    if (browser) {
      initializeIcons(); // Register offline icons
      registerCommandBarActions(); // Register command bar actions
    }
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
    initializeReviewStoreListeners();
    initializeDocumentStoreListeners();
    initializeTts();

    // Audio unlock logic...
    const unlockAudioContext = () => {
      const context = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      if (context.state === 'suspended') context.resume();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    };
    window.addEventListener('click', unlockAudioContext, { once: true });
    window.addEventListener('touchstart', unlockAudioContext, { once: true });

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  });

  // RESTORED: THEME LOGIC
  $effect(() => {
    const currentTheme = themeStore.theme;
    if (browser) {
      localStorage.setItem('schemas-work-theme', currentTheme);
      _applyThemeToDOM(currentTheme);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        if (themeStore.theme === 'system') _applyThemeToDOM('system');
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  });

  $effect(() => {
    if (browser) {
      localStorage.setItem(
        'schemas-work-settings-v2',
        JSON.stringify(settingsState)
      );
    }
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
