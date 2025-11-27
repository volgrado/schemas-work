<!--
  @component
  NodeDetailPanel

  @description
  A sophisticated, resizable side panel that acts as the primary interface for
  interacting with individual nodes (headings) when in Tree View.

  Features:
  - **Content Editing:** Embeds a Tiptap-based editor (`NodeDetailEditor`) for direct content manipulation.
  - **Navigation:** Supports keyboard navigation (Arrow keys) to traverse sibling nodes.
  - **TTS Integration:** Visually highlights text as it is being read aloud by the TTS engine.
  - **Glassmorphism:** Uses a glass-layer background for a modern, contextual feel.
  - **Resizability:** Integrated `ResizeHandle` allows user customization of panel width.
-->
<script lang="ts">
  import {
    nodeDetailState,
    closePanel,
    setPanelWidth,
    setIsResizing,
    navigateToSibling,
    requestFocus,
  } from '$lib/modules/editor/ui/nodeDetailStore.svelte';
  import { ttsState } from '$lib/modules/tts';
  import { uiState } from '$lib/core/ui/uiStore.svelte';

  import NodeDetailHeader from './NodeDetailHeader.svelte';
  import NodeDetailFooter from './NodeDetailFooter.svelte';
  import ResizeHandle from '$lib/core/ui/ResizeHandle.svelte';
  import NodeDetailEditor from './NodeDetailEditor.svelte';

  import TTSAutoFollowController from './controllers/TTSAutoFollowController.svelte';

  // --- Resize Logic ---
  let startWidth = 0;

  /**
   * Handlers for the drag-to-resize interaction.
   * Updates the global state to disable transitions during resize for performance.
   */
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

  // --- TTS Highlighting Effect ---

  // Effect: Syncs the panel's scroll position and highlighting with the active TTS node.
  $effect(() => {
    const status = ttsState.status;
    const currentIndex = ttsState.currentNodeIndex;

    // Cleanup if not playing
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

    // Delay to ensure DOM is ready
    setTimeout(() => {
      const contentEl = document.querySelector('.panel-content');
      if (!contentEl) return;

      // Remove old highlight
      const prev = contentEl.querySelector('.tts-active-block');
      if (prev) prev.classList.remove('tts-active-block');

      // Apply new highlight based on data-pos attribute
      const target = contentEl.querySelector(`[data-pos="${currentNode.pos}"]`);
      if (target) {
        target.classList.add('tts-active-block');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  });

  // --- Keyboard Navigation Effect ---

  // Effect: Registers global keyboard shortcuts when the panel is open.
  $effect(() => {
    if (nodeDetailState.isOpen) {
      const handleKeydown = (event: KeyboardEvent) => {
        // Only handle global shortcuts if we are NOT editing text
        const isEditing = document.activeElement?.closest(
          '.node-detail-editor'
        );

        if (event.key === 'Escape') {
          closePanel();
          return;
        }

        if (isEditing) {
          // Let the editor handle its own shortcuts
          return;
        }

        // Navigation Shortcuts
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          navigateToSibling('prev');
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          navigateToSibling('next');
        }
        // Focus on node in tree
        else if (event.key === 'Enter') {
          event.preventDefault();
          requestFocus();
        }
      };

      window.addEventListener('keydown', handleKeydown, true);
      return () => window.removeEventListener('keydown', handleKeydown, true);
    }
  });

  // --- View Sync Effect ---

  // Effect: Automatically close the panel if the user switches back to the main editor view.
  $effect(() => {
    const currentView = uiState.activeView;
    if (currentView === 'editor' && nodeDetailState.isOpen) {
      closePanel();
    }
  });

  function handlePanelKeydown(event: KeyboardEvent) {
    // Stop propagation for events originating from the editor
    // to prevent them from triggering global app shortcuts (bubbling phase).
    if (
      event.target instanceof Element &&
      event.target.closest('.node-detail-editor')
    ) {
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
  <!-- Resize Handler (Left Edge) -->
  <ResizeHandle
    onResize={handleResize}
    onResizeStart={handleResizeStart}
    onResizeEnd={handleResizeEnd}
  />

  <!-- Headless Controller for TTS syncing -->
  <TTSAutoFollowController />

  <!-- Visual: Glass Background Layer -->
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
    /* Background is handled by .glass-layer */
    background-color: transparent;

    /* --- ANIMATION SETUP --- */
    transform: translateX(100%);
    visibility: hidden;
    transition:
      transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      visibility 0.5s;
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
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
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

  /* Highlight Active Block (Paragraph level) */
  :global(.tts-active-block) {
    background-color: hsla(var(--color-accent-hsl) / 0.15) !important;
    border-left: 4px solid var(--color-accent) !important;
    padding-left: calc(var(--space-md) - 4px) !important;
    border-radius: var(--radius-sm) !important;
    transition: all 0.2s ease-out !important;
    box-shadow: 0 2px 8px -2px hsla(var(--color-accent-hsl) / 0.2) !important;
  }

  /* Highlight Active Word (Karaoke style) */
  :global(.is-current-tts-word) {
    background-color: var(--color-accent) !important;
    color: white !important;
    border-radius: 2px !important;
    box-shadow: 0 0 0 1px var(--color-accent) !important;
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
