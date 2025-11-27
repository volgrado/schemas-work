<!-- src/lib/components/ui/command-bar/AiView.svelte -->
<script lang="ts">
  // --- VVVV CORRECTED IMPORTS VVVV ---
  import { editorState } from '$lib/modules/editor/ui/editorStore.svelte';
  import { documentState } from '$lib/stores/documentStore.svelte'; // Changed from documentStore
  import { getAiCommands } from '$lib/modules/command-bar/domain/commandService';
  import { goBack } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { t } from '$lib/utils/i18n';
  import type { Search } from '$lib/types';
  type Command = Search.Command;

  // --- UI Component Imports ---
  import Icon from '$lib/core/ui/Icon.svelte';
  import CommandButton from './CommandButton.svelte';
  import ViewHeader from './ViewHeader.svelte';

  // --- Reactive State Derivation ---
  // --- VVVV CORRECTED STATE ACCESS VVVV ---
  let isNodeSelected = $derived(editorState.selectedNodePos !== null);
  let isTextSelected = $derived(
    editorState.instance ? !editorState.instance.state.selection.empty : false
  );
  let hasActiveDocument = $derived(!!documentState.docId); // Changed from documentStore.state
  let hasEditorInstance = $derived(!!editorState.instance);

  // The command list is reactively updated whenever the dependent state changes.
  let aiCommands = $derived(
    getAiCommands(
      isNodeSelected,
      isTextSelected,
      hasActiveDocument,
      hasEditorInstance
    )
  );
</script>

<div class="view-container">
  <ViewHeader title={$t('ai_view.title')} onBack={goBack} />

  <div class="action-list">
    {#each aiCommands as command (command.id)}
      <CommandButton
        onclick={(e) => command.action(e)}
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

  :global(.back-button) {
    width: auto !important;
    padding: 8px !important;
  }
</style>
