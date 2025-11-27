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


  // --- Initialization Logic ---
  $effect(() => {
    // Initialize Store Listeners
    initializeReviewStoreListeners();
    initializeDocumentStoreListeners();
    initializeTts();

    // Audio Unlock Logic
    const unlockAudioContext = () => {
      const context = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      if (context.state === 'suspended') context.resume();
      // Speak empty string to unlock iOS/Safari audio
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

  import { i18n } from '$lib/utils/i18n.svelte';
  
  // ...

  // --- Reactive Action Registration ---
  $effect(() => {
    // This dependency ensures re-registration when locale changes
    i18n.locale; 
    if (browser) {
      registerCommandBarActions();
    }
  });

  // --- One-time Setup ---
  onMount(() => {
    if (browser) {
      initializeIcons(); // Register offline icons
      // registerCommandBarActions(); // Moved to effect for reactivity

    }
  });
</script>

<!-- This component is logic-only and renders nothing -->
