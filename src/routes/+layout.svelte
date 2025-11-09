<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { browser } from '$app/environment';
  import { Toaster } from 'svelte-sonner';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  import CommandBar from '$lib/components/ui/CommandBar.svelte';
  import type { Snippet } from 'svelte';

  // Import all the stores and their initializers, ensuring correct .svelte.ts paths
  import { themeStore, _applyThemeToDOM } from '$lib/stores/themeStore.svelte';
  import { initialize as initializeTts } from '$lib/stores/ttsStore.svelte';
  import { settingsState } from '$lib/stores/settingsStore.svelte';
  import { initializeDirectoryListener } from '$lib/services/core/directoryService';
  import { initializeDocumentStoreListeners } from '$lib/stores/documentStore.svelte';
  import { initializeReviewStoreListeners } from '$lib/stores/reviewStore.svelte';

  // --- STYLES ---
  import '$lib/styles/app.css';

  let { children } = $props<{ children: Snippet }>();

  // This one-time effect is the designated place for all global, client-side initializations.
  $effect(() => {
    // Call all initializers here. Svelte 5's automatic effect cleanup handles most of them.
    const cleanupDirectoryListener = initializeDirectoryListener();
    initializeReviewStoreListeners();
    initializeDocumentStoreListeners();
    initializeTts();

    // Unlock Audio Context for Mobile Browsers
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

    // The directory listener is the only one that needs a manual cleanup function returned,
    // as it uses a direct window.addEventListener.
    return () => {
      cleanupDirectoryListener();
    };
  });

  // Effect for managing theme side effects
  $effect(() => {
    // FIX: Access the public .theme rune directly to establish reactivity.
    const currentTheme = themeStore.theme;

    if (browser) {
      localStorage.setItem('schemas-work-theme', currentTheme);
      _applyThemeToDOM(currentTheme);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleSystemChange = () => {
        // FIX: Re-read the public .theme rune inside the handler.
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
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
    integrity="sha384-n8MVd4RsNIU0KOVEMeaMurdcICHZodavIMpg9DGcbEFcV3FoDb4eAZcARndCjKZX"
    crossorigin="anonymous"
  />
</svelte:head>

<!-- Global UI Components -->
<Toaster position="bottom-center" />
<OrganicCanvas />

<!-- The main content of each page is rendered here -->
{@render children?.()}

<CommandBar />
