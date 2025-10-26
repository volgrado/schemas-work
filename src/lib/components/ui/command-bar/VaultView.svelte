<!--
  @component
  VaultView

  This component renders the 'Vault Management' view within the command bar.
  It provides a dedicated space for import and export actions.
-->
<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { t } from '$lib/utils/i18n';
</script>

<nav class="action-list" aria-labelledby="vault-commands-title">
  <!-- Accessible heading for screen readers -->
  <h2 id="vault-commands-title" class="visually-hidden">
    {$t('vault_view.title')}
  </h2>

  <!-- Export Vault Action -->
  <button
    class="action-button"
    on:click={() => commandBarStore.openPasswordModal('export')}
  >
    <Icon name="download-cloud" size={18} />
    <span>{$t('vault_view.export_button')}</span>
  </button>

  <!-- Import Vault Action -->
  <button
    class="action-button"
    on:click={() => commandBarStore.openPasswordModal('import')}
  >
    <Icon name="upload-cloud" size={18} />
    <span>{$t('vault_view.import_button')}</span>
  </button>

  <!-- Visual separator -->
  <hr class="separator" />

  <!-- Button to navigate back to the main command view -->
  <button
    class="action-button"
    on:click={() => commandBarStore.setView('main')}
    aria-label={$t('vault_view.back_button_aria_label')}
  >
    <Icon name="x" size={18} />
    <span>{$t('vault_view.back_button_label')}</span>
  </button>
</nav>

<style>
  .visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    white-space: nowrap;
  }

  .separator {
    border: none;
    height: 1px;
    background-color: var(--panel-border-light);
    margin: 4px 0;
  }

  :global(.dark-theme) .separator {
    background-color: var(--panel-border-dark);
  }
</style>
