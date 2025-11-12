<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte'; // <-- ENSURE THIS IS IMPORTED
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import type { Snippet } from 'svelte';

  // Import all the stores and their initializers
  import { themeStore, _applyThemeToDOM } from '$lib/stores/themeStore.svelte';
  import { initialize as initializeTts } from '$lib/stores/ttsStore.svelte';
  import { settingsState } from '$lib/stores/settingsStore.svelte';
  import { initializeDirectoryListener } from '$lib/services/core/directoryService';
  import { initializeDocumentStoreListeners } from '$lib/stores/documentStore.svelte';
  import { initializeReviewStoreListeners } from '$lib/stores/reviewStore.svelte';

  // --- STYLES ---
  import '$lib/styles/app.css';
  import 'katex/dist/katex.min.css'; // <-- ADD THIS LOCAL IMPORT

  let { children } = $props<{ children: Snippet }>();

  // Service Worker Registration
  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => console.log('Service Worker Registered'))
        .catch((err) =>
          console.error('Service Worker registration failed:', err)
        );
    }
  });

  // This one-time effect is the designated place for all global, client-side initializations.
  $effect(() => {
    const cleanupDirectoryListener = initializeDirectoryListener();
    initializeReviewStoreListeners();
    initializeDocumentStoreListeners();
    initializeTts();

    const unlockAudioContext = () => {
      const context = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      if (context.state === 'suspended') {
        context.resume();
      }
      const utterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(utterance);
      console.log('[Layout] Global audio context unlocked by user gesture.');
    };
    window.addEventListener('click', unlockAudioContext, { once: true });
    window.addEventListener('touchstart', unlockAudioContext, { once: true });

    return () => {
      cleanupDirectoryListener();
    };
  });

  // Effect for managing theme side effects
  $effect(() => {
    const currentTheme = themeStore.theme;
    if (browser) {
      localStorage.setItem('schemas-work-theme', currentTheme);
      _applyThemeToDOM(currentTheme);
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        if (themeStore.theme === 'system') {
          _applyThemeToDOM('system');
        }
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => {
        mediaQuery.removeEventListener('change', handleSystemChange);
      };
    }
  });

  // Effect for persisting settings
  $effect(() => {
    if (browser) {
      localStorage.setItem(
        'schemas-work-settings-v2',
        JSON.stringify(settingsState)
      );
    }
  });
</script>

<svelte:head>
  <title>Schemas.Work</title>
  <!-- The external KaTeX link has been REMOVED from here -->
</svelte:head>

<!-- Global UI Components -->
<Toaster position="bottom-center" />
<OrganicCanvas />

<!-- The main content of each page is rendered here -->
{@render children?.()}

<CommandBar />
