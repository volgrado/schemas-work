<!-- src/routes/[lang]/+layout.svelte -->

<script lang="ts">
  import { browser } from '$app/environment';
  import '$lib/styles/app.css';
  import * as errorService from '$lib/services/core/errorService';

  // --- Stores ---
  import { editorStore } from '$lib/stores/editorStore';
  import { locale } from '$lib/utils/i18n';

  // --- Props ---
  // `data` is from +layout.ts. `children` is the page content snippet.
  let { data, children } = $props();

  /**
   * This reactive effect ensures that the `locale` store and the document's
   * `lang` attribute are always in sync with the `lang` parameter from the URL.
   */
  $effect(() => {
    if (browser) {
      locale.set(data.lang);
      // CORRECTED: Directly set the attribute on the root <html> element.
      document.documentElement.lang = data.lang;
    }
  });

  // --- DEBUG: Global Store Listener ---
  $effect(() => {
    // console.log('[GLOBAL LAYOUT] editorStore has changed:', $editorStore);
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
      return !import.meta.env.DEV;
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      errorService.reportError(event.reason, { type: 'unhandledrejection' });
      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection.call(window, event);
      }
      if (!import.meta.env.DEV) {
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

<!--
  THE <svelte:head> BLOCK CONTAINING THE <html> TAG HAS BEEN REMOVED.
  THIS WAS THE SOURCE OF THE ERROR.
-->

<!--
  By using `data.pathname` as the key, we ensure the page is
  fully remounted whenever the user navigates to a new URL.
-->
{#key data.pathname}
  <!--
    CORRECT SVELTE 5 SYNTAX:
    The `children` snippet must be CALLED as a function to be rendered.
  -->
  {@render children()}
{/key}
