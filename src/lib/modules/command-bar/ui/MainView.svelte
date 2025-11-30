<!--
  @component
  MainView

  @description
  The primary landing view for the Command Bar.
  It renders the top-level list of available actions (e.g., "New Schema", "Study Decks", "AI Assistant").

  Features:
  - **Reactive Commands:** Automatically updates the list based on the `actionRegistry` state.
  - **Context Awareness:** Commands can be enabled/disabled based on app state (e.g., "Read Aloud" disabled if no editor).
  - **Standard Layout:** Uses `ViewHeader` and `CommandButton` for visual consistency.

  @props
  - `openApiKeyModal`: Callback to open the API settings (passed down for specific commands).
-->
<script lang="ts">
  import { actionRegistry } from '$lib/actions/registry';
  import { i18n } from '$lib/utils/i18n.svelte';
  import type { IconName } from '$lib/core/domain/iconName';

  // --- UI Components ---
  import Icon from '$lib/core/ui/Icon.svelte';
  import CommandButton from './CommandButton.svelte';
  import ViewHeader from './ViewHeader.svelte';

  const { openApiKeyModal: _openApiKeyModal } = $props<{
    openApiKeyModal: (initialTab?: 'models' | 'keys' | 'local') => void;
  }>();

  // --- Reactive State ---
  // We use a version counter to trigger re-evaluation of the command list
  // when the registry changes (e.g., new plugins loaded).
  let registryVersion = $state(0);

  $effect(() => {
    const unsubscribe = actionRegistry.subscribe(() => {
      registryVersion++;
    });
    return unsubscribe;
  });

  // Derive the list of commands for the 'view:command-bar' context
  const mainCommands = $derived.by(() => {
    // Dependency on registryVersion ensures reactivity
    registryVersion;
    return actionRegistry
      .getActionsByContext('view:command-bar')
      .map((action) => ({
        id: action.id,
        label: action.title,
        icon: (action.icon || 'help-circle') as IconName,
        action: () => actionRegistry.execute(action.id),
        isEnabled: action.isEnabled,
      }));
  });
</script>

<div class="view-container">
  <ViewHeader title={i18n.t('main_view.title')} />

  <div class="action-list" role="menu">
    {#each mainCommands as command (command.id)}
      <CommandButton
        id={command.id}
        onclick={() => command.action()}
        disabled={command.isEnabled ? !command.isEnabled() : false}
      >
        <Icon name={command.icon} size={20} />
        <span>{command.label}</span>
      </CommandButton>
    {/each}
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
    overflow-y: auto;
    padding-top: var(--space-xs);
  }
</style>
