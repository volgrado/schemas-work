<!-- src/routes/+layout.svelte (VERSIÓN CORRECTA Y SIMPLIFICADA) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  // --- Estilos y Servicios Globales ---
  import '$lib/styles/app.css';
  import * as errorService from '$lib/services/core/errorService';

  // --- Props y Estado del Layout ---
  export let data;

  // --- Ciclo de Vida del Componente ---
  onMount(() => {
    // Sistema de Reporte de Errores Global
    const originalOnError = window.onerror;
    const originalOnUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      errorService.reportError(error || new Error(message.toString()), {
        source,
        lineno,
        colno,
        type: 'window.onerror',
      });
      if (originalOnError)
        return originalOnError.call(
          window,
          message,
          source,
          lineno,
          colno,
          error
        );
      return !import.meta.env.DEV;
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      errorService.reportError(event.reason, { type: 'unhandledrejection' });
      if (originalOnUnhandledRejection)
        return originalOnUnhandledRejection.call(window, event);
      if (!import.meta.env.DEV) event.preventDefault();
    };

    // Función de Limpieza
    return () => {
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  });
</script>

<!-- 
  El layout ahora es mucho más simple. Renderiza el `<slot />`
  y no se preocupa por la lógica de la página.
-->
<slot />
