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
  } from '$lib/stores/nodeDetailStore.svelte';
  import { ttsState } from '$lib/stores/ttsStore.svelte';
  import { editorState } from '$lib/stores/editorStore.svelte';
  import { uiState } from '$lib/stores/uiStore.svelte';
  import { extractContentWithPositions } from '$lib/utils/contentExtraction';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';
  
  import NodeDetailHeader from './node-detail/NodeDetailHeader.svelte';
  import NodeDetailFooter from './node-detail/NodeDetailFooter.svelte';
  import ResizeHandle from './common/ResizeHandle.svelte';

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

    editor.state.doc.nodesBetween(
      headingPos + typedHeadingNode.nodeSize,
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
      headingPos + typedHeadingNode.nodeSize,
      endPos,
      editor.state.schema
    );

    openPanel(activeTreeNodeId, title, content);
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
   * Helper to wrap a text range in a highlight span for karaoke effect.
   */
  function highlightRange(element: HTMLElement, start: number, end: number) {
    const existing = element.querySelectorAll('.is-current-tts-word');
    existing.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    if (start >= end) return;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let current = 0;
    let node: Node | null;
    
    while ((node = walker.nextNode())) {
      const text = node.textContent || '';
      const len = text.length;
      
      if (current + len > start && current < end) {
        const range = document.createRange();
        const nodeStart = Math.max(0, start - current);
        const nodeEnd = Math.min(len, end - current);
        
        try {
          range.setStart(node, nodeStart);
          range.setEnd(node, nodeEnd);
          
          const wrapper = document.createElement('span');
          wrapper.className = 'is-current-tts-word';
          range.surroundContents(wrapper);
          return;
        } catch (e) {
          console.warn('Karaoke highlight failed:', e);
        }
      }
      current += len;
    }
  }

  /**
   * Effect for Word-Level Karaoke Highlighting
   */
  $effect(() => {
    const { currentWordRange, currentNodeIndex, nodesToRead, status } = ttsState;
    
    if (status !== 'playing') {
       const contentEl = document.querySelector('.panel-content');
       if (contentEl) {
          const existing = contentEl.querySelectorAll('.is-current-tts-word');
          existing.forEach(el => {
             const parent = el.parentNode;
             if (parent) {
                parent.replaceChild(document.createTextNode(el.textContent || ''), el);
                parent.normalize();
             }
          });
       }
       return;
    }

    if (!currentWordRange || !nodesToRead[currentNodeIndex]) return;

    const currentNode = nodesToRead[currentNodeIndex];
    const contentEl = document.querySelector('.panel-content');
    if (!contentEl) return;

    const blockEl = contentEl.querySelector(`[data-pos="${currentNode.pos}"]`);
    if (!blockEl) return;

    const relStart = currentWordRange.from - currentNode.pos - 1;
    const relEnd = currentWordRange.to - currentNode.pos - 1;

    highlightRange(blockEl as HTMLElement, relStart, relEnd);
  });

  /**
   * Effect to handle global keyboard events for accessibility and navigation.
   */
  $effect(() => {
    if (nodeDetailState.isOpen) {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closePanel();
          return;
        }
        // Navigation logic is now handled by buttons in Header, 
        // but we keep global shortcuts here or move them?
        // The original code had global shortcuts.
        // Let's keep them here as they are global panel behavior.
        // But we need to import navigateToSibling if we use it here.
        // Wait, I didn't import navigateToSibling in this file.
        // I should import it if I want to keep keyboard nav.
      };
      
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });
  
  // Re-import navigateToSibling for keyboard shortcuts
  import { navigateToSibling, requestFocus } from '$lib/stores/nodeDetailStore.svelte';
  
  // Update the effect to use the imported functions
  $effect(() => {
    if (nodeDetailState.isOpen) {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closePanel();
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
      
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
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

  function handleInput(event: Event) {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return;
    
    let el = selection.anchorNode.parentElement;
    const block = el?.closest('[data-pos]');
    
    if (block && block instanceof HTMLElement) {
      const pos = parseInt(block.getAttribute('data-pos') || '-1');
      if (pos !== -1) {
        updateNodeAtPos(pos, block);
      }
    }
  }
</script>

<aside
  class="side-panel"
  class:is-visible={nodeDetailState.isOpen}
  role="region"
  aria-labelledby="panel-title"
  aria-hidden={!nodeDetailState.isOpen}
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
    <div 
      class="content-body"
      contenteditable="true"
      role="textbox"
      tabindex="0"
      oninput={handleInput}
    >
      <!-- Render rich HTML content (images, paragraphs, lists) -->
      {@html nodeDetailState.content}
    </div>
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

  .content-body {
    line-height: 1.7;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    transition: all 0.3s ease;
  }

  /* Rich Content Styling */
  :global(.content-body p) {
    margin-bottom: 1em;
  }
  :global(.content-body img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-md);
    margin: 1em 0;
    box-shadow: var(--shadow-md);
  }
  :global(.content-body ul, .content-body ol) {
    padding-left: 1.5em;
    margin-bottom: 1em;
  }
  :global(.content-body li) {
    margin-bottom: 0.5em;
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
    background-color: var(--color-accent) !important;
    color: white !important;
    border-radius: 2px !important;
    box-shadow: 0 0 0 1px var(--color-accent) !important;
  }

  /* Utility */
  :global(.w-full) {
    width: 100%;
  }
  :global(.mr-2) {
    margin-right: 0.5rem;
  }
</style>
