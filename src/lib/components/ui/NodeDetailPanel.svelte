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
    requestFocus,
    scrollToNodeInEditor,
    navigateToSibling,
    openPanel,
    setPanelWidth,
    setIsResizing,
    updateNodeAtPos,
  } from '$lib/stores/nodeDetailStore.svelte';
  import { 
    ttsState, 
    startReading
  } from '$lib/stores/ttsStore.svelte';
  import { editorState } from '$lib/stores/editorStore.svelte';
  import { uiState, setActiveView } from '$lib/stores/uiStore.svelte';
  import { extractContentWithPositions } from '$lib/utils/contentExtraction';
  import { getReadableNodes } from '$lib/utils/ttsUtils';
  import { DOMSerializer, type Node as ProseMirrorNode } from 'prosemirror-model';
  import { toast } from 'svelte-sonner';
  import type { TTS } from '$lib/types';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import TTSController from '$lib/components/tts/TTSController.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  /**
   * Toggle auto-follow mode.
   * When enabled, the panel updates automatically as TTS reads different sections.
   */
  let autoFollowEnabled = $state(false);

  function toggleAutoFollow() {
    autoFollowEnabled = !autoFollowEnabled;
    toast.info(autoFollowEnabled ? 'Auto-follow enabled' : 'Auto-follow disabled');
  }


  /**
   * Resize Logic
   */
  
  function startResize(e: MouseEvent) {
    setIsResizing(true);
    e.preventDefault(); // Prevent text selection
    
    const startX = e.clientX;
    const startWidth = nodeDetailState.width;
    
    function onMouseMove(e: MouseEvent) {
      // Dragging left (negative delta) increases width because panel is on the right
      const deltaX = startX - e.clientX; 
      setPanelWidth(startWidth + deltaX);
    }
    
    function onMouseUp() {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  /**
   * Effect for auto-follow: update panel content when TTS changes nodes.
   */
  $effect(() => {
    // Always follow TTS if playing, regardless of auto-follow toggle for now, 
    // or ensure the toggle is ON by default if that's the desired behavior.
    // The user complaint implies they expect it to sync.
    if (ttsState.status === 'idle') return;
    
    const activeTreeNodeId = ttsState.activeTreeNodeId;
    // If the panel is already showing this node, we don't need to reload content,
    // BUT we might need to ensure the highlight effect runs.
    if (!activeTreeNodeId || activeTreeNodeId === nodeDetailState.activeNodeId) return;

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

    // Update the panel
    // CRITICAL FIX: We must update the panel to show the node being READ, not just the one clicked.
    // This ensures the panel content stays in sync with the voice.
    openPanel(activeTreeNodeId, title, content);
  });

  /**
   * Navigate to the previous or next node in the tree.
   */
  function navigateToPrev() {
    navigateToSibling('prev');
  }

  function navigateToNext() {
    navigateToSibling('next');
  }

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

  /**
   * Effect for highlighting the currently read block in the panel.
   */
  $effect(() => {
    // Run this effect whenever the playing status or current node index changes
    const status = ttsState.status;
    const currentIndex = ttsState.currentNodeIndex;
    
    if (status !== 'playing' && status !== 'paused') {
      // Cleanup if we stop
      const contentEl = document.querySelector('.panel-content');
      if (contentEl) {
        const prev = contentEl.querySelector('.tts-active-block');
        if (prev) prev.classList.remove('tts-active-block');
      }
      return;
    }
    
    const currentNode = ttsState.nodesToRead[currentIndex];
    if (!currentNode) return;

    // Find the element with data-pos matching the node position
    // We use a slight delay to ensure DOM is updated if panel just opened
    setTimeout(() => {
      const contentEl = document.querySelector('.panel-content');
      if (!contentEl) return;

      // Remove previous highlights
      const prev = contentEl.querySelector('.tts-active-block');
      if (prev) prev.classList.remove('tts-active-block');

      // Add new highlight
      // We need to match the exact data-pos attribute
      const target = contentEl.querySelector(`[data-pos="${currentNode.pos}"]`);
      if (target) {
        target.classList.add('tts-active-block');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback: sometimes the pos might be slightly off or nested.
        // Try finding a close match or parent if needed, but exact match is best for now.
        console.debug(`[TTS] Could not find element for pos ${currentNode.pos}`);
      }
    }, 50);
  });

  /**
   * Helper to wrap a text range in a highlight span for karaoke effect.
   */
  function highlightRange(element: HTMLElement, start: number, end: number) {
    // 1. Cleanup existing word highlights in this block
    const existing = element.querySelectorAll('.is-current-tts-word');
    existing.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    if (start >= end) return;

    // 2. Find the text node(s) corresponding to the range
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let current = 0;
    let node: Node | null;
    
    while ((node = walker.nextNode())) {
      const text = node.textContent || '';
      const len = text.length;
      
      // Check overlap
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
          
          // Since we modified the DOM, the walker might be affected, but usually
          // for a single word it's fine. We break after highlighting the first match
          // to avoid complexity, assuming words don't span multiple text nodes often.
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
    
    // Cleanup if not playing
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

    // Find the active block
    const blockEl = contentEl.querySelector(`[data-pos="${currentNode.pos}"]`);
    if (!blockEl) return;

    // Calculate relative offsets
    // currentNode.pos is the start of the node. Content starts at pos + 1.
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
        // Close on Escape
        if (event.key === 'Escape') {
          closePanel();
          return;
        }
        
        // Navigation with arrow keys
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          navigateToPrev();
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          navigateToNext();
        }
        
        // Focus in tree with Enter (existing functionality)
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
   * Auto-close the panel when switching to editor view.
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
    
    // Find the closest block with a data-pos attribute
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

<!--
  The <aside> element is always present in the DOM to allow CSS transitions to
  animate its exit smoothly. A reactive class `is-visible` controls its
  position and visibility based on the store's state.
-->
<aside
  class="side-panel"
  class:is-visible={nodeDetailState.isOpen}
  role="region"
  aria-labelledby="panel-title"
  aria-hidden={!nodeDetailState.isOpen}
>
  <!-- Resize Handle -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="resize-handle"
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize panel"
    onmousedown={startResize}
  ></div>

  <!-- Glass Background Layer -->
  <div class="glass-layer"></div>

  <header class="panel-header">
    <div class="header-top">
      <!-- Navigation Chevrons -->
      <div class="nav-chevrons">
        <Button 
          variant="ghost" 
          size="sm" 
          onclick={navigateToPrev} 
          aria-label="Previous node"
          title="Previous node (← or ↑)"
        >
          <Icon name="chevron-up" size={18} />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onclick={navigateToNext} 
          aria-label="Next node"
          title="Next node (→ or ↓)"
        >
          <Icon name="chevron-down" size={18} />
        </Button>
      </div>
      
      <!-- Close Button -->
      <Button variant="ghost" size="sm" onclick={closePanel} aria-label="Close details panel">
        <Icon name="x" size={20} />
      </Button>
    </div>
    
    <h2 id="panel-title" class="panel-title" title={nodeDetailState.title}>
      {nodeDetailState.title}
    </h2>
  </header>

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

  <footer class="panel-footer">
    {#if ttsState.status === 'playing' || ttsState.status === 'paused'}
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

  .panel-header {
    padding: var(--space-lg);
    padding-top: calc(var(--height-header) + var(--space-md));
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    border-bottom: 1px solid var(--color-border);
    background: linear-gradient(to bottom, rgba(255,255,255,0.05), transparent);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xs);
  }

  .nav-chevrons {
    display: flex;
    gap: 2px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .panel-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text);
    margin: 0;
    background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    /* Truncate long titles */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
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

  /* Highlight Active Block */
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

  .label {
    font-size: 0.75rem;
    font-weight: 500;
  }

  .footer-actions :global(button) {
    justify-content: center;
    gap: var(--space-xs);
  }

  /* Mobile Responsiveness */
  @media (max-width: 480px) {
    .panel-title {
      font-size: 1.25rem;
    }

    .nav-chevrons :global(button) {
      min-width: 40px;
      min-height: 40px;
    }
    
    .panel-header {
      padding: var(--space-md);
    }
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

  /* Utility */
  :global(.w-full) {
    width: 100%;
  }
  :global(.mr-2) {
    margin-right: 0.5rem;
  }

  /* Resize Handle */
  .resize-handle {
    position: absolute;
    left: -8px;
    top: 0;
    bottom: 0;
    width: 16px;
    cursor: col-resize;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center; /* Center the grip handle */
    pointer-events: auto;
  }

  /* Hover area background */
  .resize-handle:hover,
  .resize-handle:active {
    background: linear-gradient(to right, rgba(0,0,0,0.05), transparent);
  }

  /* The vertical line indicator */
  .resize-handle::before {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: var(--color-border); /* Always visible line */
    transition: all 0.2s;
  }

  .resize-handle:hover::before,
  .resize-handle:active::before {
    background-color: var(--color-accent);
    width: 2px;
  }

  /* The grip handle (pill) */
  .resize-handle::after {
    content: '';
    width: 4px;
    height: 48px;
    background-color: var(--color-border);
    border-radius: 0 4px 4px 0;
    margin-left: 0; /* Attached to left edge */
    transition: background-color 0.2s;
    box-shadow: 1px 0 2px rgba(0,0,0,0.1);
  }

  .resize-handle:hover::after,
  .resize-handle:active::after {
    background-color: var(--color-accent);
  }
</style>
