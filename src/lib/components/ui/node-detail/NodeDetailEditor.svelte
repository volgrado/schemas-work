<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { nodeDetailState } from '$lib/stores/nodeDetailStore.svelte';
  import { editorState } from '$lib/stores/editorStore.svelte';
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
      ],
      content: nodeDetailState.content, // Initialize with HTML content
      editorProps: {
        attributes: {
          class: 'prose focus:outline-none max-w-none',
        },
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

  // React to external content changes (e.g. from TTS or navigation)
  $effect(() => {
    const newContent = nodeDetailState.content;
    const newId = nodeDetailState.activeNodeId;
    
    // If the editor exists and the ID changed, or we are not currently editing (force update)
    // We need a way to distinguish "user typed in panel" vs "user navigated to new node"
    // The simplest way is to check if the content matches current editor content? No.
    // We rely on activeNodeId changing.
    
    if (editor && !editor.isDestroyed) {
        // If the ID changed, we definitely reload.
        // Or if the content changed externally (how to know?)
        // For now, let's just reload if activeNodeId changes.
        // But wait, openPanel sets content and ID together.
        
        // We can store the last loaded ID.
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
    
    // We want to replace the range [localStartPos, localEndPos] in the main doc
    // with the current content of the panel editor.
    
    // Serialize panel content to a Slice
    // We can just use the panel's document content (Fragment)
    const panelDoc = panelEditor.state.doc;
    
    // But panelDoc is a full document (doc -> block+).
    // The range in main doc expects block+.
    // So we can use panelDoc.content.
    
    // However, we need to be careful about schema compatibility if they differ (they shouldn't).
    
    const tr = state.tr;
    
    // Check if the range is valid
    if (localStartPos >= state.doc.content.size) return;
    
    // We replace the range.
    try {
        tr.replaceWith(localStartPos, localEndPos, panelDoc.content);
        
        if (tr.docChanged) {
            view.dispatch(tr);
            
            // Update the localEndPos to reflect the new size
            // The new size is the size of the inserted content.
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
