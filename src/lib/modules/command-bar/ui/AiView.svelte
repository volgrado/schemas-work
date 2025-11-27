<!--
  @component
  AiView

  @description
  The dedicated "AI Actions" submenu within the Command Bar.
  It displays context-aware AI tools like "Create Schema from Text", "Refine Document",
  and "Generate Flashcards".

  Features:
  - Context-aware command generation.
-->
<script lang="ts">
  import CommandButton from './CommandButton.svelte';
  import ViewHeader from './ViewHeader.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import { documentState } from '$lib/modules/editor/ui/documentStore.svelte';
  import { editorState } from '$lib/modules/editor/ui/editorStore.svelte';
  import { goBack } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
  import { getAiCommands } from '../domain/commandService';

  // --- Reactive State ---
  // Determine context from global stores
  const isNodeSelected = $derived(editorState.selectedNodePos !== null);
  const isTextSelected = $derived(
    editorState.instance ? !editorState.instance.state.selection.empty : false
  );
  const hasActiveDocument = $derived(!!documentState.docId);
  const hasEditorInstance = $derived(!!editorState.instance);

  // Generate the list of available commands based on current context
  const aiCommands = $derived(
    getAiCommands(
      isNodeSelected,
      isTextSelected,
      hasActiveDocument,
      hasEditorInstance
    )
  );
</script>

<div class="view-container">
  <ViewHeader title={i18n.t('ai_view.title')} onBack={goBack} />

  <div class="action-list" role="menu">
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
