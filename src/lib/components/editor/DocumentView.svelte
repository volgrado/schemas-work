<!-- src/lib/components/editor/DocumentView.svelte -->
<script lang="ts">
  // --- LIFECYCLE HOOKS ---
  import { onMount } from 'svelte';

  // --- PROSEMIRROR & YJS ---
  import type { Node as ProseMirrorNode } from 'prosemirror-model';
  import type { IndexeddbPersistence } from 'y-indexeddb';
  import * as Y from 'yjs';
  import { Decoration, DecorationSet } from 'prosemirror-view';

  // --- TIPTAP CORE & EXTENSIONS ---
  import { Editor } from '@tiptap/core';
  import type { EditorEvents } from '@tiptap/core';
  import Collaboration from '@tiptap/extension-collaboration';
  import Document from '@tiptap/extension-document';
  import Text from '@tiptap/extension-text';
  import Heading from '@tiptap/extension-heading';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import Placeholder from '@tiptap/extension-placeholder';
  import Paragraph from '@tiptap/extension-paragraph';
  import HorizontalRule from '@tiptap/extension-horizontal-rule';
  import YouTube from '@tiptap/extension-youtube';
  import Gapcursor from '@tiptap/extension-gapcursor';
  import { ResizableImage } from '$lib/editor/extensions/ResizableImage';
  import { NodeIdExtension } from '$lib/editor/extensions/NodeIdExtension';
  import { MathInline, MathBlock } from '$lib/editor/extensions/Math';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import {
    DynamicHighlighter,
    DYNAMIC_HIGHLIGHTER_PLUGIN_KEY,
  } from '$lib/editor/extensions/DynamicHighlighter';

  // --- STORES & UTILITIES ---
  import {
    editorState,
    setInstance,
    updateSelection,
    destroyEditor,
    syncState,
  } from '$lib/stores/editorStore.svelte';
  import {
    documentState,
    updateTitle,
    clearInitialContent,
  } from '$lib/stores/documentStore.svelte';
  import { debounce } from '$lib/utils/debounce';
  import { t } from '$lib/utils/i18n';
  import { get } from 'svelte/store';
  import * as neuralIndexService from '$lib/services/ai/neuralIndexService';
  import { reviewState } from '$lib/stores/reviewStore.svelte';
  import { ttsState } from '$lib/stores/ttsStore.svelte';

  // --- COMPONENT PROPERTIES ---
  let {
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
  let localEditorInstance: Editor | null = null;

  // --- EVENT HANDLERS ---
  const syncTitleWithStore = debounce((editorInstance: Editor) => {
    const titleNode = editorInstance.state.doc.firstChild;
    if (
      titleNode &&
      titleNode.type.name === 'heading' &&
      titleNode.attrs.level === 1
    ) {
      updateTitle(titleNode.textContent);
    } else {
      updateTitle('');
    }
  }, 750);

  const handleUpdate = ({
    editor: updatedEditor,
    transaction,
  }: EditorEvents['update']) => {
    if (transaction.getMeta('isHighlighterUpdate')) {
      return;
    }
    if (transaction.docChanged) {
      syncState();
      syncTitleWithStore(updatedEditor);
      const currentDocId = documentState.docId;
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, updatedEditor.state.doc);
      }
    }
  };

  const handleSelectionUpdate = ({
    editor: updatedEditor,
    transaction,
  }: EditorEvents['selectionUpdate']) => {
    if (transaction.getMeta('isHighlighterUpdate')) {
      return;
    }
    const { selection } = updatedEditor.state;
    let newSelectedNode: ProseMirrorNode | null = null;
    let newSelectedPos: number | null = null;
    if (
      selection.constructor.name === 'NodeSelection' &&
      (selection as any).node.type.name === 'heading' &&
      !(selection as any).empty
    ) {
      newSelectedNode = (selection as any).node;
      newSelectedPos = selection.from;
    } else if (selection.empty) {
      const { $from: resolvedPos } = selection;
      const parentNode = resolvedPos.parent;
      if (parentNode.type.name === 'heading') {
        newSelectedNode = parentNode;
        newSelectedPos = resolvedPos.before(resolvedPos.depth);
      }
    }
    updateSelection(newSelectedNode, newSelectedPos);
  };

  // --- LIFECYCLE: EDITOR SETUP & TEARDOWN ---
  onMount(() => {
    if (!element) {
      console.error('Editor mount failed: Target element is not available.');
      return;
    }

    const editor = new Editor({
      element: element,
      extensions: [
        Document,
        Paragraph,
        HorizontalRule,
        Text,
        Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
        Bold,
        Italic,
        YouTube.configure({}),
        MathInline,
        MathBlock,
        NodeIdExtension,
        DynamicHighlighter,
        SlashCommandExtension,
        Collaboration.configure({ document: ydoc }),
        Gapcursor,
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            const tValue = get(t);
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              return tValue('doc_view.placeholder.title');
            }
            if (node.type.name === 'paragraph' && !node.textContent) {
              const before = editor.state.doc.resolve(pos).nodeBefore;
              if (pos === 1 || before?.type.name === 'heading') {
                return tValue('doc_view.placeholder.description');
              }
              return tValue('doc_view.placeholder.term');
            }
            return '';
          },
        }),
        ResizableImage.configure({}),
      ],
      editorProps: { attributes: { class: 'prose' } },
      onUpdate: handleUpdate,
      onSelectionUpdate: handleSelectionUpdate,
    });

    localEditorInstance = editor;
    setInstance(editor);

    if (initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      const currentDocId = documentState.docId;
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, editor.state.doc);
      }
      clearInitialContent();
    }

    syncTitleWithStore(editor);

    const onSync = (event: { synced: boolean }) => {
      if (editor && !editor.isDestroyed) {
        editor.setEditable(event.synced);
      }
    };

    if (provider) {
      editor.setEditable(provider.synced);
      provider.on('synced', onSync);
    } else {
      editor.setEditable(true);
    }

    return () => {
      destroyEditor();
      localEditorInstance = null;
      if (provider) {
        provider.off('synced', onSync);
      }
    };
  });

  /**
   * Smoothly scrolls the editor to keep the currently highlighted element
   * in a comfortable reading position (the vertical center of the viewport).
   */
  function autoscrollToHighlight() {
    if (!localEditorInstance) return;

    // Find the most specific highlight available: first the word, fall back to the node.
    const targetEl =
      localEditorInstance.view.dom.querySelector('.is-current-tts-word') ||
      localEditorInstance.view.dom.querySelector('.is-current-tts-node');

    if (!targetEl) return;

    // To prevent distracting small scrolls, we only scroll if the element
    // is outside of a comfortable central viewing area ("dead zone").
    const rect = targetEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const topThreshold = viewportHeight * 0.3; // 30% from the top
    const bottomThreshold = viewportHeight * 0.7; // 70% from the top

    if (rect.top < topThreshold || rect.bottom > bottomThreshold) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }

  // --- REACTIVE EFFECT: DYNAMIC HIGHLIGHTER BRIDGE FOR REVIEWS ---
  $effect(() => {
    const reviewDecorations = reviewState.decorationSet;
    if (!localEditorInstance) return;
    const pluginState = DYNAMIC_HIGHLIGHTER_PLUGIN_KEY.getState(
      localEditorInstance.state
    );
    if (!pluginState || pluginState.reviewDecorations.eq(reviewDecorations)) {
      return;
    }
    const tr = localEditorInstance.state.tr
      .setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, { reviewDecorations })
      .setMeta('isHighlighterUpdate', true);
    localEditorInstance.view.dispatch(tr);
  });

  // --- REACTIVE EFFECT: DYNAMIC HIGHLIGHTER & AUTOSCROLL BRIDGE FOR TTS ---
  $effect(() => {
    const { status, nodesToRead, currentNodeIndex, currentWordRange } =
      ttsState;
    if (!localEditorInstance) return;

    // Create the highlight for the current node (paragraph/heading)
    let nodeDecoSet = DecorationSet.empty;
    if (['playing', 'paused'].includes(status) && nodesToRead.length > 0) {
      const currentNode = nodesToRead[currentNodeIndex];
      if (currentNode && currentNode.pos !== undefined && currentNode.node) {
        const deco = Decoration.node(
          currentNode.pos,
          currentNode.pos + currentNode.node.nodeSize,
          { class: 'is-current-tts-node' }
        );
        nodeDecoSet = DecorationSet.create(localEditorInstance.state.doc, [
          deco,
        ]);
      }
    }

    // Create the highlight for the current word
    let wordDecoSet = DecorationSet.empty;
    if (currentWordRange) {
      const wordDeco = Decoration.inline(
        currentWordRange.from,
        currentWordRange.to,
        { class: 'is-current-tts-word' }
      );
      wordDecoSet = DecorationSet.create(localEditorInstance.state.doc, [
        wordDeco,
      ]);
    }

    // Dispatch a transaction to update both highlight types in the plugin
    const tr = localEditorInstance.state.tr;
    tr.setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, {
      ttsDecorations: nodeDecoSet,
      ttsWordDecorations: wordDecoSet,
    });
    localEditorInstance.view.dispatch(tr);

    // Trigger the autoscroll after the browser has rendered the new highlights
    if (status === 'playing') {
      setTimeout(autoscrollToHighlight, 0);
    }
  });
</script>

<div bind:this={element}></div>

<style>
  /* All highlight styles are now handled by the global app.css,
     so this component only needs styles for its specific extensions. */

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
</style>
