<!--
  @component
  MainView

  This component renders the primary view of the command bar.

  ARCHITECTURAL NOTE: This component uses Svelte 5's `$derived` rune to create a
  reactive command list. It automatically recalculates the list whenever its source
  stores (`ttsStore`, `editorStore`) change. This matches the final, correct
  architecture used throughout the command bar.
-->
<script lang="ts">
  import { getCommands } from '$lib/services/features/commandService';
  import { ttsStore } from '$lib/stores/ttsStore';
  import { editorStore } from '$lib/stores/editorStore';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';
  import type { Command } from '$lib/types';

  // This prop is passed down from the parent CommandBar component.
  let { openApiKeyModal } = $props<{ openApiKeyModal: () => void }>();

  // --- THE FINAL, WORKING SOLUTION ---

  // STEP 1: Derive the simple state values directly from the stores.
  // This creates clean, pure Svelte 5 signals.
  let ttsStatus = $derived($ttsStore.status);
  let isEditorReady = $derived(!!$editorStore.instance);

  // STEP 2: Derive the final command list from our simple signals and the prop.
  // The dependency chain is now crystal clear and robust.
  let mainCommands = $derived(
    getCommands(openApiKeyModal, ttsStatus, isEditorReady)
  );
</script>

<nav class="action-list" aria-labelledby="commandbar-title">
  <!-- Accessible heading for screen readers -->
  <h2 id="commandbar-title" class="visually-hidden">
    {$t('main_view.title')}
  </h2>

  <!-- The loop now iterates over the reactive 'mainCommands' variable. -->
  {#each mainCommands as command (command.id)}
    <button
      class="action-button"
      onclick={command.action}
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
