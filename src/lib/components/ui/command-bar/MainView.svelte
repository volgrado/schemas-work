<!--
  @file MainView.svelte
  @component

  @description
  The primary view for the command bar, displaying the main list of available commands.
  It adheres to the standardized view layout and reactively derives its command list from
  the `commandService`, ensuring the UI is always in sync with the application's state.
-->
<script lang="ts">
  import { getCommands } from '$lib/services/features/commandService';
  // --- VVVV CORRECTED (1/2): Import the reactive state object directly. VVVV ---
  import { ttsState } from '$lib/stores/ttsStore.svelte';
  import { editorState } from '$lib/stores/editorStore.svelte'; // Changed from editorStore
  import { t } from '$lib/utils/i18n';
  import type { Search } from '$lib/types';
  type Command = Search.Command;

  // --- UI Component Imports ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import CommandButton from './CommandButton.svelte';
  import ViewHeader from './ViewHeader.svelte';

  let { openApiKeyModal } = $props<{ openApiKeyModal: () => void }>();

  // --- Reactive State Derivation ---
  // --- VVVV CORRECTED (2/2): Access reactive state directly from the imported state object. VVVV ---
  let ttsStatus = $derived(ttsState.status);
  let isEditorReady = $derived(!!editorState.instance); // Changed from editorStore.state

  // The command list is reactively updated whenever the dependent state changes.
  let mainCommands = $derived(
    getCommands(openApiKeyModal, ttsStatus, isEditorReady)
  );
</script>

<div class="view-container">
  <ViewHeader title={$t('main_view.title')} />

  <div class="action-list">
    {#each mainCommands as command (command.id)}
      <CommandButton
        onclick={(event) => command.action(event)}
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
