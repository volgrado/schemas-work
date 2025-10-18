<!--
  @component
  AiView

  This component renders the 'AI Actions' view within the command bar. It provides a
  dedicated space for AI-powered commands, fetched from the `commandService`.

  Features:
  - Displays a curated list of AI-specific commands.
  - Includes a 'Back' button to return to the main command bar view.
  - Like MainView, it uses a visually hidden heading for accessibility.
-->
<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  import * as commandService from '$lib/services/features/commandService';
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { t } from '$lib/utils/i18n'; // Corrected import path for i18n

  // Fetches only the commands specifically designated as AI actions.
  const aiCommands = commandService.getAiCommands();
</script>

<nav class="action-list" aria-labelledby="ai-commands-title">
  <!-- Accessible heading for screen readers -->
  <h2 id="ai-commands-title" class="visually-hidden">{$t('ai_view.title')}</h2>

  {#each aiCommands as command (command.id)}
    <button
      class="action-button"
      on:click={command.action}
      disabled={command.isEnabled && !command.isEnabled()}
    >
      <Icon name={command.icon} size={18} />
      <span>{command.label}</span>
    </button>
  {/each}

  <!-- Visual separator to distinguish commands from navigation -->
  <hr class="separator" />

  <!-- Button to navigate back to the main command view -->
  <button
    class="action-button"
    on:click={() => commandBarStore.setView('main')}
    aria-label={$t('ai_view.back_button_aria_label')}
  >
    <Icon name="x" size={18} />
    <span>{$t('ai_view.back_button_label')}</span>
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

  /* --- Dark Mode --- */
  @media (prefers-color-scheme: dark) {
    .separator {
      background-color: var(--panel-border-dark);
    }
  }
</style>
