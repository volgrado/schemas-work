<!--
  @component
  NodeDetailFooter

  @description
  The persistent footer for the Node Detail Panel.
  It houses context-sensitive actions or embeds the TTS Controller when active.

  Features:
  - **Context Switching:** Toggles between default actions and the embedded `TTSController`.
  - **Study Integration:** Launches TTS study mode starting from the current node.
  - **Navigation:** "Document" button jumps back to the editor view, scrolling to the node.
-->
<script lang="ts">
  import { ttsState, startReading } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { editorState } from '$lib/modules/editor/ui/editorStore.svelte';
  import { setActiveView } from '$lib/core/ui/uiStore.svelte';
  import {
    nodeDetailState,
    scrollToNodeInEditor,
  } from '$lib/modules/editor/ui/nodeDetailStore.svelte';
  import { getReadableNodes } from '$lib/modules/tts/infra/ttsUtils';
  import { toast } from 'svelte-sonner';
  import type { TTS } from '$lib/modules/tts/domain/types';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import TTSController from '$lib/modules/tts/ui/TTSController.svelte';

  /**
   * Navigates the user back to the main document editor, focusing on the current node.
   */
  function focusInDocument() {
    setActiveView('editor');

    // Defer scroll to ensure the view transition has started
    setTimeout(() => {
      scrollToNodeInEditor();
    }, 150);
  }

  /**
   * Initiates Text-to-Speech playback starting from the current node.
   */
  function studyFromHere() {
    const { instance: editor } = editorState;
    if (!editor || !nodeDetailState.activeNodeId) {
      console.warn('Cannot start TTS: editor not ready or no active node');
      return;
    }

    // Ensure consistency
    editor.chain().focus().ensureNodeIds().run();

    // Generate the reading queue
    const allNodes = getReadableNodes(editor);

    // Locate start position
    const currentIndex = allNodes.findIndex(
      (n: TTS.ReadableNode) =>
        n.parentHeadingId === nodeDetailState.activeNodeId
    );

    if (currentIndex === -1) {
      toast.info('Could not start TTS from this node');
      return;
    }

    // Play
    const nodesToRead = allNodes.slice(currentIndex);
    startReading(nodesToRead);

    toast.success('Started study mode');
  }
</script>

<footer class="panel-footer">
  <!-- Conditional Render: Show Player OR Actions -->
  {#if ttsState.status !== 'idle'}
    <TTSController embedded={true} />
  {:else}
    <div class="footer-actions">
      <Button
        variant="ghost"
        onclick={focusInDocument}
        title="Locate in Document"
      >
        <Icon name="file-text" size={18} />
        <span class="label">Document</span>
      </Button>

      <Button
        variant="primary"
        onclick={studyFromHere}
        title="Start Study Mode"
      >
        <Icon name="zap" size={18} />
        <span class="label">Study</span>
      </Button>
    </div>
  {/if}
</footer>

<style>
  .panel-footer {
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.02);
  }

  .footer-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-sm);
  }

  .label {
    font-size: 0.75rem;
    font-weight: 500;
  }

  .footer-actions :global(button) {
    justify-content: center;
    gap: var(--space-xs);
  }

  /* Responsive: Stack buttons on narrow panels */
  @media (max-width: 380px) {
    .footer-actions {
      grid-template-columns: 1fr;
    }

    .label {
      display: inline;
    }
  }

  /* Hide labels on very narrow screens */
  @media (max-width: 280px) {
    .label {
      display: none;
    }
  }
</style>
