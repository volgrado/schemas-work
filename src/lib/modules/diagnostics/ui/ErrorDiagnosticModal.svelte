<!--
  @component
  ErrorDiagnosticModal

  @description
  A developer-centric tool for inspecting application health.
  It displays a chronological list of error logs captured by the `errorService`,
  providing a transparent way to debug issues in production.

  Features:
  - **Log Viewer:** Collapsible, detailed JSON view of each error log.
  - **Copy Report:** Generates a formatted text report (including User Agent) for easy sharing.
  - **Persistence:** Clears stored logs from LocalStorage.
  - **Navigation:** Integrated back button to return to the Command Bar.

  @props
  - `show` (boolean): Visibility control.
  - `onClose` (function): Close callback.
-->
<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import * as errorService from '$lib/core/services/errorService';
  import type { ErrorLog } from '$lib/core/services/errorService';
  import { toast } from 'svelte-sonner';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import { open as openCommandBar } from '$lib/modules/command-bar/ui/commandBarStore.svelte';

  const { show = false, onClose } = $props<{
    show?: boolean;
    onClose: () => void;
  }>();

  // --- State ---
  let logs = $state<ErrorLog[]>([]);
  let logAreaEl = $state<HTMLDivElement | null>(null);

  // --- Effects ---
  $effect(() => {
    if (show) {
      // Fetch latest logs when modal opens
      logs = errorService.getLogs().reverse(); // Newest first
      logAreaEl?.scrollTo(0, 0);
    }
  });

  // --- Actions ---

  async function copyLogs() {
    if (logs.length === 0) {
      toast.info(i18n.t('toast.info.nothing_to_copy'));
      return;
    }
    const report = `--- ${i18n.t('error_diagnostic.report_header')} ---\nTimestamp: ${new Date().toISOString()}\nUser Agent: ${navigator.userAgent}\n------------------------------------\n\n${JSON.stringify(
      logs,
      null,
      2
    )}`;
    try {
      await navigator.clipboard.writeText(report.trim());
      toast.success(i18n.t('toast.success.diagnostic_report_copied'));
    } catch (error) {
      errorService.reportError(error, { operation: 'copyDiagnosticLogs' });
      toast.error(i18n.t('toast.error.could_not_copy_report'));
    }
  }

  function clearLogs() {
    errorService.clearLogs();
    logs = [];
    toast.info(i18n.t('toast.info.error_logs_cleared'));
  }

  const isStale = (timestamp: string | number) => {
    const oneDay = 24 * 60 * 60 * 1000;
    const logTime = new Date(timestamp).getTime();
    return Date.now() - logTime > oneDay;
  };

  function handleBack() {
    onClose();
    openCommandBar();
  }
</script>

<Modal
  title={i18n.t('error_diagnostic.title')}
  {show}
  {onClose}
  onBack={handleBack}
  width="lg"
>
  <div class="diagnostic-container">
    <p class="explanation">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html i18n.t('error_diagnostic.explanation')}
    </p>

    <div class="log-area" bind:this={logAreaEl}>
      {#if logs.length > 0}
        {#each logs as log, i (log.timestamp + i)}
          <details class="log-entry" open={i === 0}>
            <summary class="log-summary">
              <div class="summary-content">
                <span class="timestamp" class:stale={isStale(log.timestamp)}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span class="message">{log.message}</span>
              </div>
              <div class="chevron">
                <Icon name="chevron-down" size={16} />
              </div>
            </summary>
            <pre><code>{JSON.stringify(log, null, 2)}</code></pre>
          </details>
        {/each}
      {:else}
        <EmptyState
          title={i18n.t('error_diagnostic.empty_state.title')}
          description={i18n.t('error_diagnostic.empty_state.text')}
          icon="check-circle"
        />
      {/if}
    </div>

    <footer class="modal-actions">
      <Button
        onclick={clearLogs}
        variant="secondary"
        disabled={logs.length === 0}
      >
        <Icon name="trash-2" size={16} />
        {i18n.t('error_diagnostic.clear_logs')}
      </Button>
      <Button onclick={copyLogs} variant="primary" disabled={logs.length === 0}>
        <Icon name="copy" size={16} />
        {i18n.t('error_diagnostic.copy_report')}
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
    background-color: var(--color-background-raised);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
    max-height: 45vh;
    overflow-y: auto;
    border: 1px solid var(--color-border);
  }
  .log-entry {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    border-bottom: 1px solid var(--color-border);
  }
  .log-entry:last-child {
    border-bottom: none;
  }
  .log-summary {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm);
    list-style: none;
    transition: background-color 0.2s ease;
  }
  .log-summary::-webkit-details-marker {
    display: none;
  }

  .log-summary:hover {
    background-color: var(--color-background);
  }

  .summary-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    overflow: hidden;
  }
  .timestamp {
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
  }
  .timestamp.stale {
    opacity: 0.7;
  }

  .message {
    font-weight: 600;
    font-family: var(--font-main);
    color: var(--color-danger);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chevron {
    color: var(--color-text-tertiary);
    transition: transform 0.2s ease;
  }
  .log-entry[open] > .log-summary .chevron {
    transform: rotate(180deg);
  }
  pre {
    margin-top: 0;
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-background);
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--color-text);
    border-top: 1px solid var(--color-border);
  }
  .modal-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }
</style>
