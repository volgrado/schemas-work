<!-- src/lib/components/ui/ErrorDiagnosticModal.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  // --- Componentes de UI ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // --- Servicios ---
  import * as errorService from '$lib/services/core/errorService';
  import type { ErrorLog } from '$lib/services/core/errorService';

  // --- Props ---
  export let show: boolean = false;
  export let onClose: () => void;

  // --- Estado Local ---
  let logs: ErrorLog[] = [];

  // Usamos una variable reactiva `$:`. Se ejecutará cada vez que `show` cambie.
  // Si `show` es true, cargamos los logs. Esto es más eficiente que `onMount`
  // porque asegura que los logs están actualizados cada vez que se abre el modal.
  $: if (show) {
    loadLogs();
  }

  function loadLogs() {
    logs = errorService.getLogs();
  }

  async function copyLogs() {
    if (logs.length === 0) {
      toast.info('No hay nada que copiar.');
      return;
    }
    const report = `
--- SCHEMAS.WORK DIAGNOSTIC REPORT ---
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
------------------------------------

${JSON.stringify(logs, null, 2)}
`;
    try {
      await navigator.clipboard.writeText(report.trim());
      toast.success('Informe de diagnóstico copiado al portapapeles.');
    } catch (error) {
      errorService.reportError(error, { operation: 'copyDiagnosticLogs' });
      toast.error('No se pudo copiar el informe.');
    }
  }

  function clearLogs() {
    errorService.clearLogs();
    loadLogs(); // Recargamos la lista para que la UI se actualice
    toast.info('Se han limpiado los registros de errores.');
  }
</script>

<Modal title="Diagnóstico de Errores" {show} {onClose}>
  <div class="diagnostic-container">
    <p class="explanation">
      Aquí se muestra una lista de los errores técnicos que han ocurrido en la
      aplicación. Si tienes un problema, copia este informe y compártelo con el
      equipo de soporte.
      <strong
        >Tus datos personales o el contenido de tus esquemas no se incluyen
        aquí.</strong
      >
    </p>

    <div class="log-area">
      {#if logs.length > 0}
        {#each logs as log, i (log.timestamp + i)}
          <details class="log-entry" open={i === 0}>
            <summary>
              <span class="timestamp">
                {new Date(log.timestamp).toLocaleString()}
              </span>
              <span class="message">{log.message}</span>
            </summary>
            <pre><code>{JSON.stringify(log, null, 2)}</code></pre>
          </details>
        {/each}
      {:else}
        <div class="empty-state">
          <Icon name="check-circle" size={24} />
          <!-- Usamos un ícono que no existe, lo crearemos en Icon.svelte -->
          <p>¡Todo en orden! No se han registrado errores.</p>
        </div>
      {/if}
    </div>

    <footer class="modal-actions">
      <Button
        on:click={clearLogs}
        variant="secondary"
        disabled={logs.length === 0}
      >
        <Icon name="trash-2" size={16} />
        Limpiar Registros
      </Button>
      <Button
        on:click={copyLogs}
        variant="primary"
        disabled={logs.length === 0}
      >
        <Icon name="copy" size={16} />
        Copiar Informe
      </Button>
    </footer>
  </div>
</Modal>

<style>
  .diagnostic-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .explanation {
    font-size: 0.9rem;
    color: var(--color-gray-500);
    margin: 0;
    line-height: 1.6;
  }

  .log-area {
    background-color: var(--color-gray-100);
    border-radius: var(--space-sm);
    padding: var(--space-sm);
    max-height: 40vh;
    overflow-y: auto;
    border: 1px solid var(--panel-border-light, transparent); /* Usamos variable existente */
  }

  .log-entry {
    margin-bottom: var(--space-sm);
    font-family: monospace;
    font-size: 0.8rem;
  }
  .log-entry:last-child {
    margin-bottom: 0;
  }

  .log-entry summary {
    cursor: pointer;
    display: flex;
    gap: var(--space-md);
    align-items: baseline;
    padding: var(--space-xs);
    border-radius: var(--space-xs);
  }

  .log-entry summary:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .timestamp {
    color: var(--color-gray-500);
    flex-shrink: 0;
  }

  .message {
    font-weight: 600;
    color: var(--color-danger);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  pre {
    margin-top: var(--space-sm);
    padding: var(--space-sm);
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: var(--space-xs);
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--color-text);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    gap: var(--space-md);
    color: var(--color-gray-500);
  }

  .modal-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  @media (prefers-color-scheme: dark) {
    .log-area {
      border-color: var(--panel-border-dark);
    }
    .log-entry summary:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    pre {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
</style>
