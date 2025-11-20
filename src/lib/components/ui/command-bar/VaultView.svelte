<!-- src/lib/components/ui/command-bar/VaultView.svelte -->
<script lang="ts">
  import { t } from '$lib/utils/i18n';
  // FIX: Import the action functions directly from the store.
  import {
    goBack,
    openPasswordModal,
  } from '$lib/stores/commandBarStore.svelte';

  // --- UI Component Imports ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import CommandButton from './CommandButton.svelte';
  import ViewHeader from './ViewHeader.svelte';
</script>

<div class="view-container">
  <ViewHeader title={$t('vault_view.title')} onBack={goBack}>
  </ViewHeader>

  <div class="action-list">
    <!-- FIX: Call the imported action function directly. -->
    <CommandButton onclick={() => openPasswordModal('export')}>
      <Icon name="download-cloud" size={20} />
      <span>{$t('vault_view.export_button')}</span>
    </CommandButton>

    <!-- FIX: Call the imported action function directly. -->
    <CommandButton onclick={() => openPasswordModal('import')}>
      <Icon name="upload-cloud" size={20} />
      <span>{$t('vault_view.import_button')}</span>
    </CommandButton>
  </div>
</div>

<style>
  /* All styles are unchanged and correct */
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
