<script lang="ts">
  import { t } from '$lib/utils/i18n';
  import Button from '@ui/Button.svelte';
  import Icon from '@ui/Icon.svelte';
  import * as backupService from '$lib/services/features/backupService';
  import { fileSystemStore } from '@modules/file-system';
  import { toast } from 'svelte-sonner';

  let { error } = $props<{ error: unknown }>();

  let isExpanded = $state(false);

  function handleReload() {
    window.location.reload();
  }

  async function handleEmergencyBackup() {
    try {
      const password = prompt($t('backup_service.prompts.enter_password_export'));
      if (!password) return;

      await backupService.exportVault(password);
    } catch (e) {
      console.error('Emergency backup failed:', e);
      alert('Backup failed. Please try to copy your data manually if possible.');
    }
  }

  async function handleFactoryReset() {
    if (confirm($t('settings.danger_zone.reset_confirm'))) {
      try {
        await fileSystemStore.clear();
        localStorage.clear();
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        }
        window.location.reload();
      } catch (e) {
        console.error('Factory reset failed:', e);
        alert('Factory reset failed. You may need to clear site data manually in browser settings.');
      }
    }
  }

  function handleReportBug() {
    const report = `
Error Report:
${getErrorMessage(error)}

Stack Trace:
${getErrorStack(error)}

Flight Recorder:
${getTelemetry(error)}
    `.trim();

    navigator.clipboard.writeText(report).then(() => {
      toast.success('Error report copied to clipboard!');
      window.open('https://github.com/your-repo/issues/new', '_blank');
    }).catch(() => {
      alert('Could not copy report. Please copy it manually from the details below.');
    });
  }

  function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Unknown error occurred';
  }

  function getErrorStack(err: unknown): string {
    if (err instanceof Error && err.stack) return err.stack;
    return JSON.stringify(err, null, 2);
  }

  function getTelemetry(err: unknown): string {
    // Check if the error object has the telemetry property attached by errorService
    if (typeof err === 'object' && err !== null && 'telemetry' in err) {
      const telemetry = (err as any).telemetry;
      if (Array.isArray(telemetry)) {
        return telemetry.join('\n');
      }
    }
    // Fallback: Check if we can get it from the errorService logs (not ideal here, but okay)
    return 'No telemetry available.';
  }
</script>

<div class="error-boundary">
  <div class="content">
    <div class="icon-wrapper">
      <Icon name="alert-triangle" size={48} />
    </div>
    <h1>{$t('error_boundary.title') || 'Something went wrong'}</h1>
    <p class="subtitle">{$t('error_boundary.description') || 'The application encountered an unexpected error. Don\'t worry, your data is likely safe.'}</p>

    <div class="actions">
      <Button onclick={handleReload} variant="primary">
        <Icon name="refresh-cw" size={16} />
        {$t('error_boundary.actions.reload')}
      </Button>
      
      <Button onclick={handleEmergencyBackup} variant="secondary">
        <Icon name="download-cloud" size={16} />
        {$t('error_boundary.actions.backup')}
      </Button>

      <Button onclick={handleReportBug} variant="secondary">
        <Icon name="git-branch" size={16} />
        {$t('error_boundary.actions.report')}
      </Button>

      <div class="divider"></div>

      <Button onclick={handleFactoryReset} variant="danger">
        <Icon name="trash-2" size={16} />
        {$t('error_boundary.actions.reset')}
      </Button>
    </div>

    <div class="details">
      <button class="toggle-details" onclick={() => isExpanded = !isExpanded}>
        {isExpanded ? $t('error_boundary.details.hide') : $t('error_boundary.details.show')}
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
      </button>
      
      {#if isExpanded}
        <pre class="error-log">
{getErrorMessage(error)}

--- Stack Trace ---
{getErrorStack(error)}

--- Flight Recorder ---
{getTelemetry(error)}
        </pre>
      {/if}
    </div>
  </div>
</div>

<style>
  .error-boundary {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: var(--color-background);
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-max);
    padding: var(--space-xl);
  }

  .content {
    max-width: 500px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .icon-wrapper {
    color: var(--color-danger);
    margin-bottom: var(--space-sm);
  }

  h1 {
    font-size: 2rem;
    margin: 0;
    font-weight: 700;
  }

  .subtitle {
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }

  .divider {
    height: 1px;
    background-color: var(--color-border);
    margin: var(--space-sm) 0;
  }

  .details {
    margin-top: var(--space-lg);
    text-align: left;
  }

  .toggle-details {
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin: 0 auto;
    padding: var(--space-xs) var(--space-sm);
  }

  .toggle-details:hover {
    color: var(--color-text);
  }

  .error-log {
    margin-top: var(--space-sm);
    padding: var(--space-md);
    background-color: var(--color-gray-50);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
    text-align: left;
  }
</style>
