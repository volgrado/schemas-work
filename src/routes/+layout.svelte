<!-- src/routes/+layout.svelte (REFACTORIZADO A SVELTE 5 CON RUNES) -->
<script lang="ts">
  import { browser } from '$app/environment';
  import '$lib/styles/app.css';
  import * as errorService from '$lib/services/core/errorService';

  // --- Store para el Test ---
  import { editorStore } from '$lib/stores/editorStore';

  // --- Props (estilo Svelte 5) ---
  let { data } = $props();

  // --- TEST: Listener Global del Store ---
  // Este efecto reactivo es nuestra herramienta clave para depurar.
  // Se ejecutará cada vez que el valor de `editorStore` cambie.
  $effect(() => {
    // La suscripción es automática al usar el prefijo '$'
    console.log('[LAYOUT GLOBAL] El editorStore ha cambiado:', $editorStore);
  });

  // --- EFECTO: Manejo de Errores Globales (reemplaza onMount/onDestroy) ---
  // Este efecto se ejecuta una vez cuando el componente se monta en el cliente.
  // La función que retorna se ejecutará como limpieza cuando el componente se desmonte.
  $effect(() => {
    // Los efectos que interactúan con APIs del navegador (window)
    // deben protegerse para no ejecutarse durante el renderizado en servidor (SSR).
    if (!browser) {
      return;
    }

    // --- Lógica de "Setup" ---
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
      // Retorna true para prevenir el comportamiento por defecto en producción
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

    // --- Lógica de "Limpieza" ---
    // Esta función se ejecutará automáticamente cuando el layout se desmonte.
    return () => {
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  });
</script>

<slot />
