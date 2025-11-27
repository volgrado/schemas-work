<!--
  @component
  AppInitializer

  @description
  A headless utility component responsible for bootstrapping the application's
  global state, side effects, and event listeners.

  Key Responsibilities:
  1. **Store Initialization:** Sets up reactive listeners for Document and Review stores.
  2. **TTS Setup:** Initializes the Text-to-Speech engine and handles "audio context unlocking" for mobile browsers.
  3. **Theme Management:** Persists theme preferences to localStorage and reacts to system theme changes.
  4. **Settings Persistence:** Auto-saves user settings (API keys, model preferences) to localStorage.
  5. **Icon Registration:** Loads the bundled icon set for offline usage.
  6. **Localization:** Reactively re-registers command bar actions when the locale changes.

  Usage:
  This component should be mounted once at the root of the application (e.g., in `+layout.svelte`).
  It does not render any visible UI.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  // --- Store Initializers ---
  import { themeStore, _applyThemeToDOM } from '$lib/stores/themeStore.svelte';
  import { initialize as initializeTts } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { settingsState } from '$lib/stores/settingsStore.svelte';
  import { initializeDocumentStoreListeners } from '$lib/stores/documentStore.svelte';
  import { initializeReviewStoreListeners } from '$lib/stores/reviewStore.svelte';
  import { initializeIcons } from '$lib/services/iconService';
  import { registerCommandBarActions } from '$lib/init';
  import { i18n } from '$lib/utils/i18n.svelte';


  // --- Initialization Logic ---
  $effect(() => {
    // Initialize Global Store Listeners
    // These set up the reactivity chains for document syncing and SRS reviews.
    initializeReviewStoreListeners();
    initializeDocumentStoreListeners();

    // Initialize TTS engine
    initializeTts();

    // --- Audio Context Unlock ---
    // Mobile browsers (especially iOS Safari) require a user gesture to unlock
    // the AudioContext and SpeechSynthesis API. We attach a one-time listener.
    const unlockAudioContext = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const context = new AudioContext();
        if (context.state === 'suspended') context.resume();
      }
      // Playing an empty utterance unlocks the speech synthesis queue.
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    };
    
    if (browser) {
      window.addEventListener('click', unlockAudioContext, { once: true });
      window.addEventListener('touchstart', unlockAudioContext, { once: true });
    }

    return () => {
      if (browser) {
        window.removeEventListener('click', unlockAudioContext);
        window.removeEventListener('touchstart', unlockAudioContext);
      }
    };
  });

  // --- Theme & Settings Persistence ---

  // Effect: Sync Theme changes to LocalStorage and DOM
  $effect(() => {
    const currentTheme = themeStore.theme;
    if (browser) {
      localStorage.setItem('schemas-work-theme', currentTheme);
      _applyThemeToDOM(currentTheme);

      // Listen for OS-level theme changes if 'system' is selected
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        if (themeStore.theme === 'system') _applyThemeToDOM('system');
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  });

  // Effect: Auto-save Settings to LocalStorage
  $effect(() => {
    if (browser) {
      localStorage.setItem(
        'schemas-work-settings-v2',
        JSON.stringify(settingsState)
      );
    }
  });

  // --- Reactive Action Registration ---

  // Effect: Re-register commands when the language changes
  $effect(() => {
    // Dependency on locale triggers re-run when language switches
    i18n.locale; 
    if (browser) {
      registerCommandBarActions();
    }
  });

  // --- One-time Setup ---
  onMount(() => {
    if (browser) {
      initializeIcons(); // Register Lucide icons for offline use
    }
  });
</script>

<!-- Logic-only component; no visual output -->
