<!--
  @component
  NodeDetailEditor

  @description
  A dedicated Tiptap editor instance running inside the Node Detail side panel.
  It allows users to edit the content of a specific node (and its children) in isolation
  while keeping the main document synchronized.

  Features:
  - **Isolated Editing:** Loads a slice of the main document into a separate editor instance.
  - **Bi-directional Sync:** Changes in the panel are propagated to the main editor via ProseMirror transactions.
  - **TTS Highlighting:** Visualizes the current spoken word (Karaoke effect) within the panel context.
  - **Slash Commands:** Supports the same slash commands as the main editor.

  @props
  - None (Driven by `nodeDetailState` and `editorStore`).
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Table } from '@tiptap/extension-table';
  import { TableRow } from '@tiptap/extension-table-row';
  import { TableCell } from '@tiptap/extension-table-cell';
  import { TableHeader } from '@tiptap/extension-table-header';
  import Blockquote from '@tiptap/extension-blockquote';
  import BulletList from '@tiptap/extension-bullet-list';
  import OrderedList from '@tiptap/extension-ordered-list';
  import ListItem from '@tiptap/extension-list-item';
  import {
    SlashCommandExtension,
    DataPosExtension,
    TTSHighlightExtension,
  } from '$lib/modules/editor';
  import { nodeDetailState } from '$lib/modules/editor/ui/nodeDetailStore.svelte';
  import { editorState } from '$lib/modules/editor';
  import { ttsState } from '$lib/modules/tts';

  let element = $state<HTMLDivElement | null>(null);
  let editor = $state<Editor | null>(null);

  // Range in the main document that this panel represents
  const localStartPos = $derived(nodeDetailState.contentStartPos);
  const localEndPos = $derived(nodeDetailState.contentEndPos);

  // Sync lock to prevent circular updates (Panel -> Main -> Panel)
  let isSyncing = false;
  let lastLoadedId: string | null = null;

  // --- Lifecycle ---
  onMount(() => {
    if (!element) return;

    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        // Configure slash commands to work in this secondary editor view
        SlashCommandExtension.configure({
          allowAnyView: true,
        }),
        DataPosExtension,
        TTSHighlightExtension,
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        Blockquote,
        BulletList,
        OrderedList,
        ListItem,
      ],
      content: nodeDetailState.content, // Initial load
      editorProps: {
        attributes: {
          class: 'prose focus:outline-none max-w-none',
        },
      },
      onUpdate: ({ transaction }) => {
        if (!transaction.docChanged || isSyncing) return;
        syncToMainDocument(editor!);
      },
    });

    return () => {
      editor?.destroy();
    };
  });

  // --- Effects ---

  // Effect: Sync TTS highlighting
  $effect(() => {
    if (!editor || editor.isDestroyed) return;

    const { status, currentWordRange, currentNodeIndex, nodesToRead } =
      ttsState;

    // Clear if not playing or if context is lost
    if (
      status !== 'playing' ||
      !currentWordRange ||
      !nodesToRead[currentNodeIndex]
    ) {
      editor.commands.clearTTSHighlight();
      return;
    }

    const currentNode = nodesToRead[currentNodeIndex];

    // Calculate relative positions within the node's text content
    const relStart = currentWordRange.from - currentNode.pos - 1;
    const relEnd = currentWordRange.to - currentNode.pos - 1;

    editor.commands.setTTSHighlight(currentNode.pos, relStart, relEnd);
  });

  // Effect: Load new content when the active node changes in the global state
  $effect(() => {
    if (nodeDetailState.activeNodeId !== lastLoadedId && editor) {
      isSyncing = true;
      editor.commands.setContent(nodeDetailState.content);
      lastLoadedId = nodeDetailState.activeNodeId;
      isSyncing = false;
    }
  });

  // --- Logic ---

  /**
   * Propagates changes from this isolated editor back to the main document.
   * Uses `tr.replaceWith` to surgically update only the relevant range.
   */
  function syncToMainDocument(panelEditor: Editor) {
    if (localStartPos === null || localEndPos === null) return;

    const mainEditor = editorState.instance;
    if (!mainEditor) return;

    const { state, view } = mainEditor;
    const panelDoc = panelEditor.state.doc;
    const tr = state.tr;

    // Safety check for bounds
    if (localStartPos >= state.doc.content.size) return;

    try {
      // Replace the range in the main doc with the panel's new content
      tr.replaceWith(localStartPos, localEndPos, panelDoc.content);

      if (tr.docChanged) {
        view.dispatch(tr);

        // Update our tracking range to match the new content size
        const newSize = panelDoc.content.size;
        nodeDetailState.contentEndPos = localStartPos + newSize;
      }
    } catch (e) {
      console.error('Failed to sync panel to main doc:', e);
    }
  }
</script>

<div class="node-detail-editor" bind:this={element}></div>

<style>
  .node-detail-editor {
    height: 100%;
  }

  /* Typography overrides for the side panel context */
  :global(.node-detail-editor .prose) {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.7;
  }

  :global(.node-detail-editor .prose p) {
    margin-bottom: 1em;
  }

  :global(
    .node-detail-editor .prose h1,
    .node-detail-editor .prose h2,
    .node-detail-editor .prose h3
  ) {
    color: var(--color-text);
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
</style>
