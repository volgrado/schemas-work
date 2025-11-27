<!-- 
  @file PasswordModal.svelte
  @component

  @description
  An exceptional and secure modal for handling vault import/export operations.
  It prompts the user for a password and orchestrates the backup service.
-->
<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Spinner from '$lib/core/ui/Spinner.svelte';
  // FIX: Import the reactive state rune directly from the store.
  import { commandBarState } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import * as backupService from '$lib/services/features/backupService';
  import * as errorService from '$lib/core/services/errorService';

  // --- Svelte 5 Props ---
  let { show = $bindable(false) } = $props<{ show?: boolean }>();

  // --- Local State ---
  let passwordInput = $state('');
  let isProcessing = $state(false);
  let passwordInputElement = $state<HTMLInputElement | null>(null);

  // --- Derived State ---
  // FIX: Access the rune state directly without the '$' prefix.
  const action = $derived(commandBarState.passwordModalAction);
  const isExport = $derived(action === 'export');

  $effect(() => {
    if (show) {
      setTimeout(() => {
        passwordInputElement?.focus();
      }, 100);
    }
  });

  function closeAndReset() {
    show = false;
    setTimeout(() => {
      passwordInput = '';
      isProcessing = false;
    }, 300);
  }

  async function handlePasswordSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!passwordInput || isProcessing) return;

    isProcessing = true;
    try {
      if (isExport) {
        await backupService.exportVault(passwordInput);
      } else {
        await backupService.importVault(passwordInput);
      }
    } catch (error) {
      errorService.reportError(error, { operation: `backup:${action}` });
    } finally {
      closeAndReset();
    }
  }
</script>

<Modal
  title={isExport
    ? i18n.t('command_bar.password_modal.title.export')
    : i18n.t('command_bar.password_modal.title.import')}
  bind:show
  onClose={closeAndReset}
>
  <form class="password-form" onsubmit={handlePasswordSubmit}>
    <p class="explanation">
      {isExport
        ? i18n.t('command_bar.password_modal.description.export')
        : i18n.t('command_bar.password_modal.description.import')}
    </p>
    <input
      type="password"
      bind:this={passwordInputElement}
      bind:value={passwordInput}
      placeholder={i18n.t('command_bar.password_modal.password_placeholder')}
      required
      autocomplete="new-password"
      disabled={isProcessing}
    />
    <footer class="modal-actions">
      <Button
        onclick={closeAndReset}
        variant="secondary"
        disabled={isProcessing}
      >
        {i18n.t('command_bar.password_modal.cancel_button')}
      </Button>
      <Button type="submit" disabled={!passwordInput || isProcessing}>
        {#if isProcessing}
          <Spinner size="sm" />
          {i18n.t('common.processing')}
        {:else}
          <Icon name={isExport ? 'download-cloud' : 'upload-cloud'} size={16} />
          {isExport
            ? i18n.t('command_bar.password_modal.confirm_button.export')
            : i18n.t('command_bar.password_modal.confirm_button.import')}
        {/if}
      </Button>
    </footer>
  </form>
</Modal>

<style>
  /* All styles are unchanged and correct */
  .password-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  .explanation {
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-lg);
  }
  :global(.dark-theme) .modal-actions {
    border-color: var(--color-border-dark);
  }
</style>
