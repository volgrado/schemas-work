<script lang="ts">
  import { browser } from '$app/environment';
  import '$lib/styles/app.css';
  import * as errorService from '$lib/services/core/errorService';
  // --- Stores ---
  import { locale } from '$lib/utils/i18n';
  import { theme, applyTheme } from '$lib/stores/themeStore';
  import OrganicCanvas from '$lib/components/ui/OrganicCanvas.svelte';
  // --- Props ---
  let { data, children } = $props();

  /**
   * This reactive effect ensures that the `locale` store and the document's
   * `lang` attribute are always in sync with the `lang` parameter from the URL.
   */
  $effect(() => {
    if (browser) {
      locale.set(data.lang);
      document.documentElement.lang = data.lang;
    }
  });

  // Apply theme reactively when the store changes.
  $effect(() => {
    applyTheme($theme);
  });

  /**
   * This effect sets up global error handling for the entire application.
   */
  $effect(() => {
    if (!browser) {
      return;
    }

    const originalOnError = window.onerror;
    const originalOnUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      errorService.reportError(error || new Error(message.toString()), {
        source,
        lineno,
        colno,
        type: 'window.onerror',
      });
      if (originalOnError) {
        return originalOnError.call(
          window,
          message,
          source,
          lineno,
          colno,
          error
        );
      }
      const isDevelopment = import.meta.env.DEV;
      return !isDevelopment;
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      errorService.reportError(event.reason, { type: 'unhandledrejection' });
      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection.call(window, event);
      }
      const isDevelopment = import.meta.env.DEV;
      if (!isDevelopment) {
        event.preventDefault();
      }
    };

    // Cleanup function.
    return () => {
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  });
</script>

<OrganicCanvas />
{#key data.pathname}
  {@render children()}
{/key}
