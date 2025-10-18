<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  import * as commandService from '$lib/services/features/commandService';
  import { t } from '$lib/services/i18n';

  const commands = commandService.getCommands();
</script>

<nav class="action-list" aria-labelledby="commandbar-title">
  <h2 id="commandbar-title" class="visually-hidden">
    {$t('main_view.title')}
  </h2>

  {#each commands as command (command.id)}
    <button
      class="action-button"
      on:click={command.action}
      disabled={command.isEnabled && !command.isEnabled()}
    >
      <Icon name={command.icon} size={18} />
      <span>{command.label}</span>
    </button>
  {/each}
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
</style>
