<!--
  @file src/routes/[lang]/+layout.svelte
  @description This layout applies to all pages within a specific language context (e.g., /en, /es).
  It is responsible for setting up global application concerns that are language- and client-dependent.

  Key Responsibilities:
  1.  **Language Synchronization**: It uses a Svelte 5 `$effect` to reactively synchronize the application's
      i18n `locale` store and the document's `lang` attribute with the `lang` parameter from the URL.
      This ensures that all parts of the app have access to the current language.
  2.  **Theme Application**: It subscribes to the `themeStore` and applies the correct theme class
      (e.g., 'dark-theme') to the document root, making the theming system reactive.
  3.  **Global Error Handling**: It sets up global `window.onerror` and `window.onunhandledrejection`
      handlers to catch any uncaught exceptions in the application. These errors are then reported
      to the `errorService` for centralized logging and diagnostics.
  4.  **Persistent Background**: It renders the `<OrganicCanvas />` component, providing a consistent,
      animated background across all pages.
  5.  **Transition Management**: The `{#key data.pathname}` block is a crucial Svelte technique. It
      tells Svelte to treat navigations to different paths as distinct instances of the slot's
      content, ensuring that page transitions (like `fade` or `fly`) are correctly triggered
      when the user navigates between pages.
-->
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
