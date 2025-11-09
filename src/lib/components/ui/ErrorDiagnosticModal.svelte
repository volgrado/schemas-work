<!-- src/lib/components/ui/ErrorDiagnosticModal.svelte -->
<script lang="ts">
  import { t } from '$lib/utils/i18n';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import * as errorService from '$lib/services/core/errorService';
  import type { ErrorLog } from '$lib/services/core/errorService';
  import { toast } from 'svelte-sonner';

  let {
    show = false,
    onClose,
    children,
  } = $props<{ show?: boolean; onClose: () => void; children?: any }>();

  let logs = $state<ErrorLog[]>([]);
  let logAreaEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (show) {
      logs = errorService.getLogs().reverse();
      logAreaEl?.scrollTo(0, 0);
    }
  });

  async function copyLogs() {
    if (logs.length === 0) {
      toast.info($t('toast.info.nothing_to_copy'));
      return;
    }
    const report = `--- ${$t('error_diagnostic.report_header')} ---\nTimestamp: ${new Date().toISOString()}\nUser Agent: ${navigator.userAgent}\n------------------------------------\n\n${JSON.stringify(
      logs,
      null,
      2
    )}`;
    try {
      await navigator.clipboard.writeText(report.trim());
      toast.success($t('toast.success.diagnostic_report_copied'));
    } catch (error) {
      errorService.reportError(error, { operation: 'copyDiagnosticLogs' });
      toast.error($t('toast.error.could_not_copy_report'));
    }
  }

  function clearLogs() {
    errorService.clearLogs();
    logs = [];
    toast.info($t('toast.info.error_logs_cleared'));
  }

  // FIX: Updated the function to correctly handle a string or number timestamp.
  const isStale = (timestamp: string | number) => {
    const oneDay = 24 * 60 * 60 * 1000;
    // Convert the timestamp to a numeric value before comparison.
    const logTime = new Date(timestamp).getTime();
    return Date.now() - logTime > oneDay;
  };
</script>

<Modal title={$t('error_diagnostic.title')} {show} {onClose}>
  <div class="diagnostic-container">
    <p class="explanation">
      {@html $t('error_diagnostic.explanation')}
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
        <div class="empty-state">
          <div class="empty-icon">
            <Icon name="check-circle" size={32} />
          </div>
          <h3 class="empty-title">
            {$t('error_diagnostic.empty_state.title')}
          </h3>
          <p class="empty-text">{$t('error_diagnostic.empty_state.text')}</p>
        </div>
      {/if}
    </div>

    <footer class="modal-actions">
      <Button
        onclick={clearLogs}
        variant="secondary"
        disabled={logs.length === 0}
      >
        <Icon name="trash-2" size={16} />
        {$t('error_diagnostic.clear_logs')}
      </Button>
      <Button onclick={copyLogs} variant="primary" disabled={logs.length === 0}>
        <Icon name="copy" size={16} />
        {$t('error_diagnostic.copy_report')}
      </Button>
    </footer>
  </div>
</Modal>

<style>
  /* Styles remain the same */
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
    border-radius: var(--border-radius-md);
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
  }
  .log-summary::-webkit-details-marker {
    display: none;
  }
  .log-summary:hover {
    background-color: var(--color-gray-100);
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
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl) 0;
    gap: var(--space-sm);
    color: var(--color-text-secondary);
    text-align: center;
  }
  .empty-icon {
    color: var(--color-success-text);
    background-color: var(--color-success-bg);
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-md);
  }
  .empty-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }
  .empty-text {
    margin: 0;
    max-width: 300px;
    line-height: 1.6;
  }
  .modal-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }
  :global(.dark-theme) .log-area {
    background-color: var(--color-gray-950);
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .log-entry {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .log-summary:hover {
    background-color: var(--color-gray-800);
  }
  :global(.dark-theme) pre {
    background-color: var(--color-gray-900);
  }
  :global(.dark-theme) .empty-title {
    color: var(--color-text-dark);
  }
  :global(.dark-theme) .empty-icon {
    color: var(--color-success-text);
    background-color: rgba(72, 187, 120, 0.1);
  }
  :global(.dark-theme) .modal-actions {
    border-color: var(--color-border-dark);
  }
</style>
