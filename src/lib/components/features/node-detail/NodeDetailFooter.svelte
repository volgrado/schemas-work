<script lang="ts">
  import {
    ttsState,
    startReading
  } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { editorState } from '$lib/modules/editor/ui/editorStore.svelte';
  import { uiState, setActiveView } from '$lib/stores/uiStore.svelte';
  import { nodeDetailState, scrollToNodeInEditor } from '$lib/stores/nodeDetailStore.svelte';
  import { getReadableNodes } from '$lib/modules/tts/infra/ttsUtils';
  import { toast } from 'svelte-sonner';
  import type { TTS } from '$lib/types';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import TTSController from '$lib/modules/tts/ui/TTSController.svelte';

  /**
   * Switch to editor view and scroll to the node's position.
   * The panel will auto-close when switching views.
   */
  function focusInDocument() {
    // Switch to editor view (panel will auto-close)
    setActiveView('editor');
    
    // Small delay to allow view transition, then scroll
    setTimeout(() => {
      scrollToNodeInEditor();
    }, 150);
  }

  /**
   * Start TTS study mode from this node.
   */
  function studyFromHere() {
    const { instance: editor } = editorState;
    if (!editor || !nodeDetailState.activeNodeId) {
      console.warn('Cannot start TTS: editor not ready or no active node');
      return;
    }

    // Ensure node IDs exist
    editor.chain().focus().ensureNodeIds().run();

    // Get all readable nodes
    const allNodes = getReadableNodes(editor);
    
    // Find the index of the current node
    const currentIndex = allNodes.findIndex(
      (n: TTS.ReadableNode) => n.parentHeadingId === nodeDetailState.activeNodeId
    );

    if (currentIndex === -1) {
      toast.info('Could not start TTS from this node');
      return;
    }

    // Start from the current node onwards
    const nodesToRead = allNodes.slice(currentIndex);
    startReading(nodesToRead);
    
    toast.success('Started study mode');
  }
</script>

<footer class="panel-footer">
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

  /* Hide labels on very narrow screens, show icons only */
  @media (max-width: 280px) {
    .label {
      display: none;
    }
  }
</style>
