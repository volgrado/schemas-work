<!--
  @component
  VaultView

  @description
  The "Vault Management" submenu in the Command Bar.
  It provides high-level actions for data portability:
  - **Export Vault:** Backup the entire database to an encrypted JSON file.
  - **Import Vault:** Restore a previous backup (wiping current data).

  Implementation Note:
  - Uses `PasswordModal` (triggered via `commandBarStore`) to secure these sensitive operations.
-->
<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import {
    goBack,
    openPasswordModal,
  } from '$lib/modules/command-bar/ui/commandBarStore.svelte';

  // --- UI Component Imports ---
  import Icon from '$lib/core/ui/Icon.svelte';
  import CommandButton from './CommandButton.svelte';
  import ViewHeader from './ViewHeader.svelte';
</script>

<div class="view-container">
  <ViewHeader title={i18n.t('vault_view.title')} onBack={goBack} />

  <div class="action-list">
    <CommandButton onclick={() => openPasswordModal('export')}>
      <Icon name="download-cloud" size={20} />
      <span>{i18n.t('vault_view.export_button')}</span>
    </CommandButton>

    <CommandButton onclick={() => openPasswordModal('import')}>
      <Icon name="upload-cloud" size={20} />
      <span>{i18n.t('vault_view.import_button')}</span>
    </CommandButton>
  </div>
</div>

<style>
  .view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .action-list {
    display: flex;
    flex-direction: column;
    padding-top: var(--space-xs);
    overflow-y: auto;
  }

  :global(.back-button) {
    width: auto !important;
    padding: 8px !important;
  }
</style>
