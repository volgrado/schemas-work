<!--
  @component
  AppInitializer

  @description
  A headless utility component responsible for bootstrapping the application's
  global state, side effects, and event listeners.

  Key Responsibilities:
  1. **Bootstrapping:** Delegates core initialization to `AppController`.
  2. **Theme Management:** Persists theme preferences to localStorage and reacts to system theme changes.
  3. **Settings Persistence:** Auto-saves user settings (API keys, model preferences) to localStorage.
  4. **Localization:** Reactively re-registers command bar actions when the locale changes.

  Usage:
  This component should be mounted once at the root of the application (e.g., in `+layout.svelte`).
  It does not render any visible UI.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  // --- Core Controller ---
  import { AppController } from '$lib/core/services/AppController';

  // --- Store Dependencies (for Reactivity) ---
  import {
    themeStore,
    _applyThemeToDOM,
  } from '$lib/modules/settings/ui/themeStore.svelte';
  import { settingsState } from '$lib/modules/settings/ui/settingsStore.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';

  // --- Initialization Logic ---

  // One-time boot
  onMount(async () => {
    if (browser) {
      AppController.initialize();

      // Cleanup Local AI (WebLLM) caches if they exist
      if ('caches' in window) {
        try {
          const keyList = await caches.keys();
          const webllmKeys = keyList.filter(key => key.includes('webllm') || key.includes('gh-config'));
          if (webllmKeys.length > 0) {
            console.log('Cleaning up Local AI caches:', webllmKeys);
            await Promise.all(webllmKeys.map(key => caches.delete(key)));
            console.log('Local AI caches deleted.');
          }
        } catch (e) {
          console.warn('Failed to clean up Local AI caches:', e);
        }
      }
    }
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
      AppController.registerGlobalActions();
    }
  });
</script>

<!-- Logic-only component; no visual output -->
