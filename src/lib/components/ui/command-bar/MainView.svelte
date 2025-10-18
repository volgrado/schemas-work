<!--
  @component
  MainView

  This component renders the primary view of the command bar. It displays a list of
  the main actions a user can take, which are fetched from the `commandService`.

  Features:
  - Dynamically renders a list of commands.
  - Each command is a button with an icon and a label.
  - Handles disabling commands based on the `isEnabled` function provided by the service.
  - Includes a visually hidden heading (`h2`) for accessibility, providing a title for screen readers.
-->
<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  import * as commandService from '$lib/services/features/commandService';
  import { t } from '$lib/utils/i18n';

  // Fetches the list of available commands from the dedicated service.
  const commands = commandService.getCommands();
</script>

<!-- 
  The <nav> element provides a semantic container for the list of command actions.
  `aria-labelledby` points to the hidden heading for better screen reader context.
-->
<nav class="action-list" aria-labelledby="commandbar-title">
  <!-- 
    This heading is visually hidden but essential for accessibility.
    It provides a title for the command list that screen readers can announce.
  -->
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
  /* 
    The `visually-hidden` class is a common accessibility pattern to hide an element
    from the visual layout while keeping it accessible to screen readers.
  */
  .visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    white-space: nowrap; /* Keep the content on a single line. */
  }
</style>
