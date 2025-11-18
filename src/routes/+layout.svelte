<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import NodeDetailPanel from '$lib/components/ui/NodeDetailPanel.svelte';
  import type { Snippet } from 'svelte';

  import { nodeDetailState } from '$lib/stores/nodeDetailStore.svelte';

  // --- RESTORED IMPORTS ---
  import { themeStore, _applyThemeToDOM } from '$lib/stores/themeStore.svelte';
  import { initialize as initializeTts } from '$lib/stores/ttsStore.svelte';
  import { settingsState } from '$lib/stores/settingsStore.svelte';
  import { initializeDirectoryListener } from '$lib/services/core/directoryService';
  import { initializeDocumentStoreListeners } from '$lib/stores/documentStore.svelte';
  import { initializeReviewStoreListeners } from '$lib/stores/reviewStore.svelte';

  import '$lib/styles/app.css';
  import 'katex/dist/katex.min.css';

  let { children } = $props<{ children: Snippet }>();

  // --- RESTORED LOGIC ---
  // Without this, your theme and stores will never load!
  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch(console.error);
    }
  });

  $effect(() => {
    const cleanupDirectoryListener = initializeDirectoryListener();
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

    return () => cleanupDirectoryListener();
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
</script>

<!-- 
  FIX: Added 'bg-background' and 'text-foreground' 
  This ensures the shell actually uses the theme colors defined in CSS variables.
-->
<div class="app-shell bg-background text-foreground">
  <Toaster position="bottom-center" />

  <!-- 
    Ensure OrganicCanvas is positioned ABSOLUTE/FIXED in its own file, 
    or it will push the grid down.
  -->
  <OrganicCanvas />
  <CommandBar />

  <main class="app-grid" class:panel-open={nodeDetailState.isOpen}>
    <div class="content-area">
      {@render children?.()}
    </div>
    <NodeDetailPanel />
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    position: relative; /* Creates a positioning context for children if needed */
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

  .app-grid.panel-open {
    grid-template-columns: 1fr 480px;
  }

  .content-area {
    overflow: hidden;
    position: relative;
    height: 100%;
  }
</style>
