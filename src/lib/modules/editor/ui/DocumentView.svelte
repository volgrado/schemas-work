<!--
  @component
  DocumentView

  @description
  The visual container for the Tiptap editor instance.

  Responsibilities:
  - **Mounting:** Initializes the `EditorController` when the component mounts.
  - **Lifecycle:** Properly cleans up the editor instance on unmount to prevent memory leaks.
  - **Reactivity Bridge:**
    - Syncs review highlights (flashcards) from `reviewStore`.
    - Syncs TTS highlights (currently spoken word/node) from `ttsStore` and triggers auto-scrolling.
    - Syncs visualization modes (Color Mode) from `uiStore`.
  - **Styling:** Applies editor-specific styles, including custom node views (ResizableImage) and color mode overrides.
-->
<script lang="ts">
  // --- LIFECYCLE HOOKS ---
  import { onMount, onDestroy } from 'svelte';

  // --- PROSEMIRROR & YJS ---
  import type { IndexeddbPersistence } from 'y-indexeddb';
  import * as Y from 'yjs';
  import { Decoration, DecorationSet } from 'prosemirror-view';

  // --- CONTROLLER ---
  import type { EditorController } from '$lib/modules/editor/infra/EditorController';

  // --- STORES ---
  import { reviewState } from '$lib/modules/study/ui/reviewStore.svelte';
  import { ttsState } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { uiState } from '$lib/core/ui/uiStore.svelte';

  // --- COMPONENT PROPERTIES ---
  const {
    ydoc,
    initialContent = null,
    provider,
  } = $props<{
    ydoc: Y.Doc;
    initialContent?: object | null;
    provider: IndexeddbPersistence | null;
  }>();

  // --- STATE ---
  let element = $state<HTMLDivElement | null>(null);
  let controller = $state<EditorController | null>(null);

  // --- LIFECYCLE: EDITOR SETUP & TEARDOWN ---
  onMount(() => {
    if (!element) {
      console.error('Editor mount failed: Target element is not available.');
      return;
    }

    // Lazy load the heavy EditorController to keep initial bundle size small
    (async () => {
      const { EditorController } = await import(
        '$lib/modules/editor/infra/EditorController'
      );

      if (!element) return; // Component might have unmounted during load

      controller = new EditorController({
        element,
        ydoc,
        provider,
        initialContent: initialContent ? $state.snapshot(initialContent) : null,
      });

      controller.mount();
    })();

    return () => {
      controller?.destroy();
      controller = null;
    };
  });

  // --- REACTIVE EFFECT: DYNAMIC HIGHLIGHTER BRIDGE FOR REVIEWS ---
  // Syncs flashcard review highlights (e.g., "active card") to the editor.
  $effect(() => {
    const reviewDecorations = reviewState.decorationSet;
    if (!controller) return;

    controller.updateHighlighter({ reviewDecorations });
  });

  // --- REACTIVE EFFECT: DYNAMIC HIGHLIGHTER & AUTOSCROLL BRIDGE FOR TTS ---
  // Syncs Text-to-Speech highlights and triggers auto-scrolling.
  $effect(() => {
    const { status, nodesToRead, currentNodeIndex, currentWordRange } =
      ttsState;
    if (!controller || !controller.editor) return;

    // 1. Highlight the current node (paragraph/heading)
    let nodeDecoSet = DecorationSet.empty;
    if (['playing', 'paused'].includes(status) && nodesToRead.length > 0) {
      const currentNode = nodesToRead[currentNodeIndex];
      if (currentNode && currentNode.pos !== undefined && currentNode.node) {
        const deco = Decoration.node(
          currentNode.pos,
          currentNode.pos + currentNode.node.nodeSize,
          { class: 'is-current-tts-node' }
        );
        nodeDecoSet = DecorationSet.create(controller.editor.state.doc, [deco]);
      }
    }

    // 2. Highlight the current word (Karaoke effect)
    let wordDecoSet = DecorationSet.empty;
    if (currentWordRange) {
      const wordDeco = Decoration.inline(
        currentWordRange.from,
        currentWordRange.to,
        { class: 'is-current-tts-word' }
      );
      wordDecoSet = DecorationSet.create(controller.editor.state.doc, [
        wordDeco,
      ]);
    }

    // 3. Update the highlighter plugin
    controller.updateHighlighter({
      ttsDecorations: nodeDecoSet,
      ttsWordDecorations: wordDecoSet,
    });

    // 4. Trigger autoscroll if playing
    if (status === 'playing') {
      setTimeout(() => controller?.autoscrollToHighlight(), 0);
    }
  });

  // --- REACTIVE EFFECT: COLOR MODE DECORATIONS ---
  // Syncs the visualization mode (e.g., coloring headings by level)
  $effect(() => {
    if (!controller) return;
    const { colorMode } = uiState;
    controller.updateColorMode(colorMode);
  });
</script>

<div
  bind:this={element}
  class:color-mode-by-level={uiState.colorMode === 'by-level'}
  class:color-mode-by-path={uiState.colorMode === 'by-path'}
></div>

<style>
  /*
    Note: Most editor styles are global (in app.css) or provided by the typography plugin.
    These styles specifically handle custom node views and dynamic overlays.
  */

  /* Resizable Image Wrapper & Handles */
  :global(.resizable-image-wrapper) {
    position: relative;
    display: inline-block;
    margin: 2px;
  }
  :global(.resizable-image-wrapper.ProseMirror-selectednode) {
    outline: 3px solid var(--color-accent);
    border-radius: var(--border-radius-md);
  }
  :global(.resize-handle) {
    position: absolute;
    width: 12px;
    height: 12px;
    z-index: var(--z-base, 10);
    background-color: var(--color-accent);
    border: 2px solid var(--color-background-raised, white);
    border-radius: var(--border-radius-sm);
    box-shadow: var(--shadow-md);
  }
  :global(.resize-handle.top-left) {
    top: -8px;
    left: -8px;
    cursor: nwse-resize;
  }
  :global(.resize-handle.top-right) {
    top: -8px;
    right: -8px;
    cursor: nesw-resize;
  }
  :global(.resize-handle.bottom-left) {
    bottom: -8px;
    left: -8px;
    cursor: nesw-resize;
  }
  :global(.resize-handle.bottom-right) {
    bottom: -8px;
    right: -8px;
    cursor: nwse-resize;
  }

  /* Cleanup: Remove default ProseMirror selection outlines to rely on our custom styling */
  :global(.ProseMirror-selectednode),
  :global([class*='ProseMirror-selected']),
  :global([class*='selectednode']) {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }
  :global(.ProseMirror-gapcursor) {
    display: none !important;
  }
  :global(.ProseMirror) {
    outline: none !important;
  }
  :global(.ProseMirror-focused) {
    outline: none !important;
  }

  /* --- COLOR MODE: BY LEVEL (Gradients applied to Headings) --- */
  /* Level 2: Blue */
  :global(.color-mode-by-level h2) {
    color: #3b82f6;
    background: var(--gradient-blue);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    width: fit-content;
  }
  /* Level 3: Orange/Pink */
  :global(.color-mode-by-level h3) {
    color: #f97316;
    background: var(--gradient-orange);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    width: fit-content;
  }
  /* Level 4: Emerald/Sky */
  :global(.color-mode-by-level h4) {
    color: #10b981;
    background: var(--gradient-green);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    width: fit-content;
  }
  /* Level 5: Violet/Fuchsia */
  :global(.color-mode-by-level h5) {
    color: #8b5cf6;
    background: var(--gradient-purple);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    width: fit-content;
  }
  /* Level 6: Cyan/Blue */
  :global(.color-mode-by-level h6) {
    color: #06b6d4;
    background: var(--gradient-cyan);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    width: fit-content;
  }

  /* --- COLOR MODE: BY PATH (Applied by Tiptap Plugin via class names) --- */
  :global(.branch-color-0) {
    color: #3b82f6 !important;
    background: var(--gradient-blue) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    width: fit-content !important;
  }
  :global(.branch-color-1) {
    color: #f97316 !important;
    background: var(--gradient-orange) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    width: fit-content !important;
  }
  :global(.branch-color-2) {
    color: #10b981 !important;
    background: var(--gradient-green) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    width: fit-content !important;
  }
  :global(.branch-color-3) {
    color: #8b5cf6 !important;
    background: var(--gradient-purple) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    width: fit-content !important;
  }
  :global(.branch-color-4) {
    color: #06b6d4 !important;
    background: var(--gradient-cyan) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    width: fit-content !important;
  }
  :global(.branch-color-5) {
    color: #6366f1 !important;
    background: var(--gradient-indigo) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    width: fit-content !important;
  }
</style>
