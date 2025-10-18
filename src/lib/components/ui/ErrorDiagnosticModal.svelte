<!--
  @component
  ErrorDiagnosticModal

  This component provides a dedicated modal dialog for viewing and managing client-side error logs
  that have been captured by the `errorService`. It serves as a crucial debugging and support tool,
  allowing users or developers to inspect issues that occurred in the application.

  Key Features:
  - Displays a list of captured error logs in a user-friendly accordion format.
  - Automatically loads the latest logs from the service whenever the modal is shown.
  - Allows users to copy a comprehensively formatted diagnostic report to their clipboard.
  - Provides a simple way to clear all stored logs from the browser's local storage.
  - Shows a helpful empty state when no errors have been logged, confirming a clean slate.
  - Built on top of the generic `Modal` component, ensuring a consistent look and feel.
  - Provides clear user feedback for actions (copy, clear) using `svelte-sonner` toasts.

  Props:
  - `show`: {boolean} - A boolean that controls the visibility of the modal. Typically bound from a parent component.
  - `onClose`: {() => void} - A callback function invoked when the modal is requested to be closed (e.g., via the Escape key or overlay click).

  Usage:
  <ErrorDiagnosticModal bind:show={isDiagnosticModalVisible} onClose={() => isDiagnosticModalVisible = false} />
-->
<script lang="ts">
  import { t } from '$lib/utils/i18n';

  // --- UI Components ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // --- Services & Types ---
  import * as errorService from '$lib/services/core/errorService';
  import type { ErrorLog } from '$lib/services/core/errorService';
  import { toast } from 'svelte-sonner';

  // --- Props ---
  /** @prop {boolean} [show=false] - Controls the visibility of the modal. */
  export let show: boolean = false;
  /** @prop {() => void} onClose - The callback function to close the modal. */
  export let onClose: () => void;

  // --- Local State ---
  /** @state {ErrorLog[]} logs - An array holding the error logs to be displayed. */
  let logs: ErrorLog[] = [];

  // --- Reactive Logic ---
  // Reload logs whenever the modal is opened.
  $: if (show) {
    loadLogs();
  }

  /**
   * Fetches the latest logs from the error service.
   */
  function loadLogs() {
    logs = errorService.getLogs();
  }

  /**
   * Generates and copies a formatted report of all logs to the user's clipboard.
   */
  async function copyLogs() {
    if (logs.length === 0) {
      toast.info($t('toast.info.nothing_to_copy'));
      return;
    }
    // The report includes a header with metadata and a JSON representation of the logs.
    const report = `
--- ${$t('error_diagnostic.report_header')} ---
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
------------------------------------

${JSON.stringify(logs, null, 2)}
`;
    try {
      await navigator.clipboard.writeText(report.trim());
      toast.success($t('toast.success.diagnostic_report_copied'));
    } catch (error) {
      // Report the error that occurred during the copy operation itself.
      errorService.reportError(error, { operation: 'copyDiagnosticLogs' });
      toast.error($t('toast.error.could_not_copy_report'));
    }
  }

  /**
   * Clears all logs from the error service and refreshes the view.
   */
  function clearLogs() {
    errorService.clearLogs();
    loadLogs(); // Refresh the list to show the empty state.
    toast.info($t('toast.info.error_logs_cleared'));
  }
</script>

<Modal title={$t('error_diagnostic.title')} {show} {onClose}>
  <div class="diagnostic-container">
    <p class="explanation">
      {$t('error_diagnostic.explanation')}
      <strong>{$t('error_diagnostic.explanation.privacy')}</strong>
    </p>

    <!-- Scrollable area for log entries -->
    <div class="log-area">
      {#if logs.length > 0}
        {#each logs as log, i (log.timestamp + i)}
          <!-- Each log is an accordion to keep the UI clean -->
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
        <!-- Empty state when no errors are present -->
        <div class="empty-state">
          <Icon name="check-circle" size={24} />
          <p>{$t('error_diagnostic.empty_state')}</p>
        </div>
      {/if}
    </div>

    <!-- Footer with action buttons -->
    <footer class="modal-actions">
      <Button
        on:click={clearLogs}
        variant="secondary"
        disabled={logs.length === 0}
      >
        <Icon name="trash-2" size={16} />
        {$t('error_diagnostic.clear_logs')}
      </Button>
      <Button
        on:click={copyLogs}
        variant="primary"
        disabled={logs.length === 0}
      >
        <Icon name="copy" size={16} />
        {$t('error_diagnostic.copy_report')}
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
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.6;
  }
  .log-area {
    background-color: var(--color-gray-50);
    border-radius: var(--space-sm);
    padding: var(--space-sm);
    max-height: 40vh;
    overflow-y: auto;
    border: 1px solid var(--color-border);
  }
  .log-entry {
    margin-bottom: var(--space-sm);
    font-family: var(--font-mono);
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
    transition: background-color 0.2s;
  }
  .log-entry summary:hover {
    background-color: var(--color-gray-100);
  }
  .timestamp {
    color: var(--color-text-tertiary);
    flex-shrink: 0;
  }
  .message {
    font-weight: 600;
    font-family: var(--font-main);
    color: var(--color-danger);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  pre {
    margin-top: var(--space-sm);
    padding: var(--space-sm);
    background-color: var(--color-background);
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
    color: var(--color-text-secondary);
  }
  .modal-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Dark Mode Styles */
  :global(.dark-theme) .explanation {
    color: var(--color-text-dark-secondary);
  }
  :global(.dark-theme) .log-area {
    background-color: var(--color-gray-900);
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .log-entry summary:hover {
    background-color: var(--color-gray-800);
  }
  :global(.dark-theme) .timestamp {
    color: var(--color-text-dark-tertiary);
  }
  :global(.dark-theme) pre {
    background-color: var(--color-gray-950);
    color: var(--color-text-dark);
  }
  :global(.dark-theme) .empty-state {
    color: var(--color-text-dark-secondary);
  }
</style>
