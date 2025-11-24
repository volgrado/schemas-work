<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { DataPosExtension } from '$lib/editor/extensions/DataPosExtension';
  import { TTSHighlightExtension } from '$lib/editor/extensions/TTSHighlightExtension'; // NEW
  import { nodeDetailState } from '$lib/stores/nodeDetailStore.svelte';
  import { editorState } from '$lib/stores/editorStore.svelte';
  import { ttsState } from '$lib/stores/ttsStore.svelte'; // NEW
  import { DOMSerializer, DOMParser } from 'prosemirror-model';

  let element = $state<HTMLDivElement | null>(null);
  let editor = $state<Editor | null>(null);

  // We need to track the local content range to sync back to the main doc
  let localStartPos = $derived(nodeDetailState.contentStartPos);
  let localEndPos = $derived(nodeDetailState.contentEndPos);

  // Flag to prevent infinite loops (Panel Update -> Main Update -> Panel Update)
  let isSyncing = false;

  onMount(() => {
    if (!element) return;

    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        SlashCommandExtension.configure({
            allowAnyView: true,
        }),
        DataPosExtension,
        TTSHighlightExtension, // NEW
      ],
      content: nodeDetailState.content, // Initialize with HTML content
      editorProps: {
        attributes: {
          class: 'prose focus:outline-none max-w-none',
        },
      },
      onCreate: ({ editor }) => {
        // Editor created
      },
      onUpdate: ({ editor, transaction }) => {
        if (!transaction.docChanged || isSyncing) return;
        syncToMainDocument(editor);
      },
    });

    return () => {
      editor?.destroy();
    };
  });

  // Sync TTS State to Editor Highlights
  $effect(() => {
    if (!editor || editor.isDestroyed) return;

    const { status, currentWordRange, currentNodeIndex, nodesToRead } = ttsState;

    if (status !== 'playing' || !currentWordRange || !nodesToRead[currentNodeIndex]) {
      editor.commands.clearTTSHighlight();
      return;
    }

    const currentNode = nodesToRead[currentNodeIndex];
    const relStart = currentWordRange.from - currentNode.pos - 1;
    const relEnd = currentWordRange.to - currentNode.pos - 1;

    editor.commands.setTTSHighlight(currentNode.pos, relStart, relEnd);
  });

  // React to external content changes (e.g. from TTS or navigation)
  $effect(() => {
    const newContent = nodeDetailState.content;
    const newId = nodeDetailState.activeNodeId;
    
    if (editor && !editor.isDestroyed) {
        // Logic handled below
    }
  });
  
  let lastLoadedId: string | null = null;
  
  $effect(() => {
      if (nodeDetailState.activeNodeId !== lastLoadedId && editor) {
          isSyncing = true;
          editor.commands.setContent(nodeDetailState.content);
          lastLoadedId = nodeDetailState.activeNodeId;
          isSyncing = false;
      }
  });

  function syncToMainDocument(panelEditor: Editor) {
    if (localStartPos === null || localEndPos === null) return;
    
    const mainEditor = editorState.instance;
    if (!mainEditor) return;

    const { state, view } = mainEditor;
    
    const panelDoc = panelEditor.state.doc;
    
    const tr = state.tr;
    
    if (localStartPos >= state.doc.content.size) return;
    
    try {
        tr.replaceWith(localStartPos, localEndPos, panelDoc.content);
        
        if (tr.docChanged) {
            view.dispatch(tr);
            
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
    /* Ensure slash menu popup can position correctly relative to this or body */
  }
  
  :global(.node-detail-editor .prose) {
    /* Match existing styles */
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.7;
  }
  
  :global(.node-detail-editor .prose p) {
    margin-bottom: 1em;
  }
  
  :global(.node-detail-editor .prose h1, .node-detail-editor .prose h2, .node-detail-editor .prose h3) {
      color: var(--color-text);
      font-weight: 600;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
  }
</style>
