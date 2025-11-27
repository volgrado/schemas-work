<!--
  @file MainView.svelte
  @component

  @description
  The primary view for the command bar, displaying the main list of available commands.
  It adheres to the standardized view layout and reactively derives its command list from
  the `commandService`, ensuring the UI is always in sync with the application's state.
-->
<script lang="ts">
  // REMOVED: import { getCommands } from '$lib/modules/command-bar/domain/commandService';
  import { actionRegistry } from '$lib/actions/registry';
  // --- VVVV CORRECTED (1/2): Import the reactive state object directly. VVVV ---
  import { ttsState } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { editorState } from '$lib/modules/editor/ui/editorStore.svelte'; // Changed from editorStore
  import { t } from '$lib/utils/i18n';
  import type { Search } from '$lib/types';
  type Command = Search.Command;

  // --- UI Component Imports ---
  import Icon from '$lib/core/ui/Icon.svelte';
  import CommandButton from './CommandButton.svelte';
  import ViewHeader from './ViewHeader.svelte';

  let { openApiKeyModal } = $props<{ openApiKeyModal: () => void }>();

  // --- Reactive State Derivation ---
  // --- VVVV CORRECTED (2/2): Access reactive state directly from the imported state object. VVVV ---
  let ttsStatus = $derived(ttsState.status);
  let isEditorReady = $derived(!!editorState.instance); // Changed from editorStore.state

  import type { IconName } from '$lib/types/iconName';

  // The command list is reactively updated whenever the dependent state changes.
  // We fetch from registry.
  // TODO: Make registry reactive or re-fetch on mount/changes?
  // For now, static fetch is fine as actions are registered at startup.
  let mainCommands = $derived(
    actionRegistry.getActionsByContext('view:command-bar').map(action => ({
      id: action.id,
      label: action.title,
      icon: (action.icon || 'help-circle') as IconName,
      action: () => actionRegistry.execute(action.id),
      isEnabled: action.isEnabled
    }))
  );
</script>

<div class="view-container">
  <ViewHeader title={$t('main_view.title')} />

  <div class="action-list">
    {#each mainCommands as command (command.id)}
      <CommandButton
        id={command.id}
        onclick={(event) => command.action()}
        disabled={command.isEnabled ? !command.isEnabled() : false}
      >
        <Icon name={command.icon} size={20} />
        <span>{command.label}</span>
      </CommandButton>
    {/each}
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
    overflow-y: auto;
    padding-top: var(--space-xs);
  }
</style>
