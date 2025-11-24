<!--
  src/lib/components/ui/NodeDetailPanel.svelte
  A docked side panel that displays detailed information about a selected node.
  This component is controlled by the `nodeDetailStore` and features a robust
  CSS-based fly-in and fly-out animation.
-->
<script lang="ts">
  import {
    nodeDetailState,
    closePanel,
    setPanelWidth,
    setIsResizing,
    updateNodeAtPos,
    openPanel,
    navigateToSibling, 
    requestFocus
  } from '$lib/stores/nodeDetailStore.svelte';
  import { ttsState } from '$lib/stores/ttsStore.svelte';
  import { editorState } from '$lib/stores/editorStore.svelte';
  import { uiState } from '$lib/stores/uiStore.svelte';
  import { extractContentWithPositions } from '$lib/utils/contentExtraction';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';
  
  import NodeDetailHeader from './node-detail/NodeDetailHeader.svelte';
  import NodeDetailFooter from './node-detail/NodeDetailFooter.svelte';
  import ResizeHandle from './common/ResizeHandle.svelte';
  import NodeDetailEditor from './node-detail/NodeDetailEditor.svelte';

  /**
   * Resize Logic
   */
  let startWidth = 0;

  function handleResizeStart() {
    setIsResizing(true);
    startWidth = nodeDetailState.width;
  }

  function handleResize(delta: number) {
    setPanelWidth(startWidth + delta);
  }

  function handleResizeEnd() {
    setIsResizing(false);
  }

  /**
   * Effect for auto-follow: update panel content when TTS changes nodes.
   */
  $effect(() => {
    // Always follow TTS if playing
    if (ttsState.status === 'idle') return;
    
    const activeTreeNodeId = ttsState.activeTreeNodeId;
    if (!activeTreeNodeId || activeTreeNodeId === nodeDetailState.activeNodeId) return;

    // CRITICAL FIX: Do not auto-open the panel if we are in Editor View.
    if (uiState.activeView === 'editor') return;

    // CRITICAL FIX 2: Only update the panel if it's already open.
    if (!nodeDetailState.isOpen) return;

    // Auto-update the panel to follow TTS
    const { instance: editor } = editorState;
    if (!editor) return;

    // Get the heading node from the editor
    let headingNode: ProseMirrorNode | null = null;
    let headingPos = -1;
    
    editor.state.doc.descendants((pmNode: ProseMirrorNode, pos: number) => {
      if (pmNode.attrs.nodeId === activeTreeNodeId && pmNode.type.name.startsWith('heading')) {
        headingNode = pmNode;
        headingPos = pos;
        return false;
      }
    });

    if (!headingNode) return;

    const typedHeadingNode = headingNode as ProseMirrorNode;
    const title = typedHeadingNode.textContent;

    // Extract content
    let endPos = editor.state.doc.content.size;
    const currentLevel = typedHeadingNode.attrs.level;
    let foundNextHeading = false;

    const startPos = headingPos + typedHeadingNode.nodeSize;

    editor.state.doc.nodesBetween(
      startPos,
      editor.state.doc.content.size,
      (pmNode: ProseMirrorNode, pos: number) => {
        if (foundNextHeading) return false;

        if (pmNode.type.name === 'heading') {
          if (pmNode.attrs.level <= currentLevel) {
            endPos = pos;
            foundNextHeading = true;
            return false;
          }
        }
      }
    );

    const content = extractContentWithPositions(
      editor.state.doc,
      startPos,
      endPos,
      editor.state.schema
    );

    openPanel(activeTreeNodeId, title, content, startPos, endPos);
  });

  /**
   * Effect for highlighting the currently read block in the panel.
   */
  $effect(() => {
    const status = ttsState.status;
    const currentIndex = ttsState.currentNodeIndex;
    
    if (status !== 'playing' && status !== 'paused') {
      const contentEl = document.querySelector('.panel-content');
      if (contentEl) {
        const prev = contentEl.querySelector('.tts-active-block');
        if (prev) prev.classList.remove('tts-active-block');
      }
      return;
    }
    
    const currentNode = ttsState.nodesToRead[currentIndex];
    if (!currentNode) return;

    setTimeout(() => {
      const contentEl = document.querySelector('.panel-content');
      if (!contentEl) return;

      const prev = contentEl.querySelector('.tts-active-block');
      if (prev) prev.classList.remove('tts-active-block');

      const target = contentEl.querySelector(`[data-pos="${currentNode.pos}"]`);
      if (target) {
        target.classList.add('tts-active-block');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  });
  /**
   * Effect to handle global keyboard events for accessibility and navigation.
   */
  $effect(() => {
    if (nodeDetailState.isOpen) {
      const handleKeydown = (event: KeyboardEvent) => {
        // Only handle global shortcuts if we are NOT editing
        const isEditing = document.activeElement?.closest('.node-detail-editor');

        if (event.key === 'Escape') {
          closePanel();
          return;
        }
        
        if (isEditing) {
          // If editing, let the editor handle it.
          // Do NOT stop propagation here in capture phase, or the editor won't get it.
          return; 
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          navigateToSibling('prev');
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          navigateToSibling('next');
        }
        else if (event.key === 'Enter') {
          event.preventDefault();
          requestFocus();
        }
      };
      
      window.addEventListener('keydown', handleKeydown, true);
      return () => window.removeEventListener('keydown', handleKeydown, true);
    }
  });

  /**
   * Effect to handle view synchronization.
   */
  $effect(() => {
    const currentView = uiState.activeView;
    if (currentView === 'editor' && nodeDetailState.isOpen) {
      closePanel();
    }
  });

  function handlePanelKeydown(event: KeyboardEvent) {
    // Stop propagation for events originating from the editor
    // to prevent them from triggering global app shortcuts (bubbling phase).
    if (event.target instanceof Element && event.target.closest('.node-detail-editor')) {
      event.stopPropagation();
    }
  }
</script>

<aside
  class="side-panel"
  class:is-visible={nodeDetailState.isOpen}
  role="region"
  aria-labelledby="panel-title"
  aria-hidden={!nodeDetailState.isOpen}
  onkeydown={handlePanelKeydown}
>
  <ResizeHandle 
    onResize={handleResize}
    onResizeStart={handleResizeStart}
    onResizeEnd={handleResizeEnd}
  />

  <!-- Glass Background Layer -->
  <div class="glass-layer"></div>

  <NodeDetailHeader />

  <div class="panel-content">
    <NodeDetailEditor />
  </div>

  <NodeDetailFooter />
</aside>

<style>
  .side-panel {
    /* Layout & Sizing */
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: visible;
    position: relative;

    /* Theming & Appearance */
    color: var(--color-text);
    background-color: var(--color-background);
    border-left: 1px solid var(--color-border);

    /* --- ANIMATION SETUP --- */
    transform: translateX(100%);
    visibility: hidden;
    transition:
      transform 0.4s var(--ease-out),
      visibility 0.4s;
    z-index: var(--z-elevated);
    box-shadow: var(--shadow-2xl);
    
    /* Fix for scrolling */
    overflow: hidden; 
    max-width: 100vw;
  }

  /* Glass Background */
  .glass-layer {
    position: absolute;
    inset: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    z-index: -1;
    border-left: 1px solid var(--glass-border);
  }

  /* --- VISIBLE STATE FOR ANIMATION --- */
  .side-panel.is-visible {
    transform: translateX(0);
    visibility: visible;
  }

  .panel-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: var(--space-lg) var(--space-lg) var(--space-xl);
    min-height: 0; /* Crucial for flex scrolling */
  }

  /* Highlight Active Block */
  :global(.tts-active-block) {
    background-color: hsla(var(--color-accent-hsl) / 0.15) !important;
    border-left: 4px solid var(--color-accent) !important;
    padding-left: calc(var(--space-md) - 4px) !important;
    border-radius: var(--radius-sm) !important;
    transition: all 0.2s ease-out !important;
    box-shadow: 0 2px 8px -2px hsla(var(--color-accent-hsl) / 0.2) !important;
  }

  /* Highlight Active Word (Karaoke) */
  :global(.is-current-tts-word) {
    background-color: var(--color-accent, #3b82f6) !important;
    color: white !important;
    border-radius: 2px !important;
    box-shadow: 0 0 0 1px var(--color-accent, #3b82f6) !important;
    position: relative;
    z-index: 1;
  }

  /* Utility */
  :global(.w-full) {
    width: 100%;
  }
  :global(.mr-2) {
    margin-right: 0.5rem;
  }
</style>
