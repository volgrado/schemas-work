<!-- src/lib/components/editor/DocumentView.svelte -->
<script lang="ts">
  // --- LIFECYCLE HOOKS ---
  import { onMount } from 'svelte';

  // --- PROSEMIRROR & YJS ---
  import type { Node as ProseMirrorNode } from 'prosemirror-model';
  import type { IndexeddbPersistence } from 'y-indexeddb';
  import * as Y from 'yjs';

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
  // VVVV CORRECTED IMPORTS VVVV
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
      updateTitle(titleNode.textContent); // Use direct function
    } else {
      updateTitle(''); // Use direct function
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
      const currentDocId = documentState.docId; // Use direct state
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

    // 1. Create the Tiptap Editor instance
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

    // 2. Handle initial content if provided (e.g., for a new document)
    if (initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      const currentDocId = documentState.docId; // Use direct state
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, editor.state.doc);
      }
      clearInitialContent(); // Use direct function
    }

    syncTitleWithStore(editor);

    // 3. FIX: Safely manage the editor's editable state
    // This listener unlocks the editor once the provider is fully synced.
    const onSync = (event: { synced: boolean }) => {
      if (editor && !editor.isDestroyed) {
        editor.setEditable(event.synced);
      }
    };

    if (provider) {
      // Set initial state and listen for changes
      editor.setEditable(provider.synced);
      provider.on('synced', onSync);
    } else {
      // If there's no provider, the editor should be editable by default.
      editor.setEditable(true);
    }

    // 4. Return the cleanup function, which runs when the component is destroyed
    return () => {
      destroyEditor();
      localEditorInstance = null;
      if (provider) {
        provider.off('synced', onSync); // Important to prevent memory leaks
      }
    };
  });

  // --- REACTIVE EFFECT: DYNAMIC HIGHLIGHTER BRIDGE ---
  // This is a correct use of $effect, as it needs to react to store changes.
  $effect(() => {
    const reviewDecorations = reviewState.decorationSet;
    const ttsDecorations = ttsState.decorationSet;

    if (!localEditorInstance) return;
    const pluginState = DYNAMIC_HIGHLIGHTER_PLUGIN_KEY.getState(
      localEditorInstance.state
    );
    if (!pluginState) return;

    if (
      pluginState.reviewDecorations.eq(reviewDecorations) &&
      pluginState.ttsDecorations.eq(ttsDecorations)
    ) {
      return;
    }

    const tr = localEditorInstance.state.tr
      .setMeta(DYNAMIC_HIGHLIGHTER_PLUGIN_KEY, {
        reviewDecorations,
        ttsDecorations,
      })
      .setMeta('isHighlighterUpdate', true);

    localEditorInstance.view.dispatch(tr);
  });
</script>

<div bind:this={element}></div>
