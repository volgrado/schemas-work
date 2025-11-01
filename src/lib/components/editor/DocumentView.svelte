<!--
  @component
  DocumentView

  This is the core component of the application, responsible for rendering the rich text editor.

  ARCHITECTURAL NOTE: This component's `onMount` cleanup function includes a crucial
  "ownership check" before clearing the global `editorStore`. This is the definitive fix for
  a component remounting bug originating in `+page.svelte`. It prevents a dying, stale
  component instance from destructively clearing the state that a new instance, or the
  user, has just set.
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';

  // --- Tiptap Core & Extensions ---
  import { Editor, findParentNode } from '@tiptap/core';
  import { NodeSelection } from 'prosemirror-state';
  import * as Y from 'yjs';
  import Collaboration from '@tiptap/extension-collaboration';
  import Document from '@tiptap/extension-document';
  import Text from '@tiptap/extension-text';
  import Heading from '@tiptap/extension-heading';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import Placeholder from '@tiptap/extension-placeholder';
  import Paragraph from '@tiptap/extension-paragraph';
  import ListItem from '@tiptap/extension-list-item';
  import BulletList from '@tiptap/extension-bullet-list';
  import OrderedList from '@tiptap/extension-ordered-list';
  import HorizontalRule from '@tiptap/extension-horizontal-rule';
  import Image from '@tiptap/extension-image';
  import YouTube from '@tiptap/extension-youtube';

  // --- Custom Application-Specific Extensions ---
  import { RoleExtension } from '$lib/editor/extensions/RoleExtension';
  import { SmartEnter } from '$lib/editor/extensions/SmartEnter';
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { NodeIdExtension } from '$lib/editor/extensions/NodeIdExtension';
  import { MathInline, MathBlock } from '$lib/editor/extensions/Math';

  // --- Stores & Utilities ---
  import { editorStore } from '$lib/stores/editorStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { modalStore } from '$lib/stores/modalStore';
  import { debounce } from '$lib/utils/debounce';
  import { t } from '$lib/utils/i18n';
  // --- NEW ---
  import * as neuralIndexService from '$lib/services/ai/neuralIndexService';

  // --- Component Properties ---
  let {
    ydoc,
    initialContent = null,
    focusedNodePos = null,
  }: {
    ydoc: Y.Doc;
    initialContent?: object | null;
    focusedNodePos?: number | null;
  } = $props();

  const dispatch = createEventDispatcher<{ focusApplied: void }>();

  let element: HTMLDivElement;
  let editor = $state<Editor | null>(null);

  const syncTitleWithStore = debounce((editorInstance: Editor) => {
    if (!editorInstance || editorInstance.isDestroyed) return;
    const firstNode = editorInstance.state.doc.firstChild;
    let newTitle = get(t)('doc_view.untitled_schema');
    if (
      firstNode &&
      firstNode.type.name === 'heading' &&
      firstNode.attrs.level === 1
    ) {
      newTitle = firstNode.textContent.trim() || newTitle;
    }
    const currentTitleInStore = get(documentStore).metadata?.title;
    if (newTitle !== currentTitleInStore) {
      documentStore.updateTitle(newTitle);
    }
  }, 750);

  $effect(() => {
    if (focusedNodePos !== null && editor && editor.isEditable) {
      const currentSelection = editor.state.selection;
      const parentListItem = findParentNode(
        (node) => node.type.name === 'listItem'
      )(currentSelection);
      if (!parentListItem || parentListItem.pos !== focusedNodePos) {
        editor.chain().focus().setNodeSelection(focusedNodePos).run();
      }
      import('svelte').then(({ tick }) =>
        tick().then(() => dispatch('focusApplied'))
      );
    }
  });

  onMount(() => {
    let selectionUpdateTimeout: ReturnType<typeof setTimeout>;
    let clearSelectionTimeout: ReturnType<typeof setTimeout>;

    const editorInstance = new Editor({
      element: element,
      extensions: [
        Document,
        Paragraph,
        ListItem,
        BulletList,
        OrderedList,
        HorizontalRule,
        Text,
        Heading.configure({ levels: [1, 2, 3] }),
        Bold,
        Italic,
        YouTube.configure({}),
        MathInline,
        MathBlock,
        RoleExtension,
        SmartEnter,
        NodeIdExtension,
        DynamicHighlighter,
        SlashCommandExtension,
        Collaboration.configure({ document: ydoc }),
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            const _t = get(t);
            if (node.type.name === 'heading' && node.attrs.level === 1)
              return _t('doc_view.placeholder.title');
            if (node.type.name === 'paragraph' && !node.textContent) {
              const parent = editor.state.doc.resolve(pos).parent;
              if (parent.firstChild === node)
                return _t('doc_view.placeholder.term');
            }
            if (
              node.type.name === 'paragraph' &&
              !node.textContent &&
              node.attrs.role === 'description'
            )
              return _t('doc_view.placeholder.description');
            return '';
          },
        }),
        Image.extend({
          addNodeView() {
            return ({ node, getPos, editor }) => {
              const container = document.createElement('div');
              container.classList.add('image-view');
              const img = document.createElement('img');
              img.setAttribute('src', node.attrs.src);
              container.append(img);
              if (editor.isEditable) {
                const button = document.createElement('button');
                button.classList.add('edit-button');
                button.innerText = get(t)('doc_view.media.edit_button');
                button.addEventListener('click', () => {
                  const pos = getPos();
                  if (pos === undefined) return;
                  modalStore.open({
                    type: 'media',
                    nodeType: 'image',
                    nodePos: pos,
                    attrs: node.attrs,
                  });
                });
                container.append(button);
              }
              return { dom: container };
            };
          },
        }).configure({}),
      ],
      editorProps: {
        attributes: { class: 'prose' },
      },
      onUpdate({ editor: updatedEditor }) {
        syncTitleWithStore(updatedEditor);

        // --- NEW LOGIC for Neural Index ---
        const currentDocId = get(documentStore).docId;
        if (currentDocId) {
          // Trigger the debounced indexing function. This is an efficient
          // way to keep the "Local Brain" in sync with user edits.
          neuralIndexService.indexDocument(
            currentDocId,
            updatedEditor.state.doc
          );
        }
        // --- END NEW LOGIC ---

        editorStore.update((s) => ({
          ...s,
          doc: updatedEditor.state.doc,
          contentVersion: s.contentVersion + 1,
        }));
      },
      onSelectionUpdate({ editor: updatedEditor }) {
        const { selection } = updatedEditor.state;
        let newSelectedNode: ProseMirrorNode | null = null;
        let newSelectedPos: number | null = null;
        if (selection instanceof NodeSelection) {
          newSelectedNode = selection.node;
          newSelectedPos = selection.from;
        } else {
          const listItem = findParentNode(
            (node) => node.type.name === 'listItem'
          )(selection);
          if (listItem) {
            newSelectedNode = listItem.node;
            newSelectedPos = listItem.pos;
          }
        }
        if (newSelectedPos !== null) {
          clearTimeout(clearSelectionTimeout);
          clearTimeout(selectionUpdateTimeout);
          selectionUpdateTimeout = setTimeout(() => {
            if (get(editorStore).selectedNodePos !== newSelectedPos) {
              editorStore.update((s) => ({
                ...s,
                selectedNode: newSelectedNode,
                selectedNodePos: newSelectedPos,
              }));
            }
          }, 50);
        } else {
          clearTimeout(selectionUpdateTimeout);
          clearTimeout(clearSelectionTimeout);
          clearSelectionTimeout = setTimeout(() => {
            if (get(editorStore).selectedNodePos !== null) {
              editorStore.update((s) => ({
                ...s,
                selectedNode: null,
                selectedNodePos: null,
              }));
            }
          }, 150);
        }
      },
    });

    editor = editorInstance;
    syncTitleWithStore(editor);

    if (initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      // --- NEW: Also index the initial content ---
      const currentDocId = get(documentStore).docId;
      if (currentDocId) {
        neuralIndexService.indexDocument(currentDocId, editor.state.doc);
      }
      documentStore.clearInitialContent();
    }
    editorStore.update((s) => ({ ...s, instance: editor }));

    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
      if (get(editorStore).instance === editor) {
        console.log(
          '%c[DocumentView Cleanup] This instance owns the store. Clearing state.',
          'color: red; font-weight: bold;'
        );
        editorStore.set({
          instance: null,
          selectedNodePos: null,
          selectedNode: null,
          contentVersion: 0,
          doc: null,
        });
      } else {
        console.log(
          '%c[DocumentView Cleanup] Stale instance detected. NOT clearing store state.',
          'color: green; font-weight: bold;'
        );
      }
    };
  });
</script>

<div class="document-layout-container">
  <div bind:this={element}></div>
</div>

<style>
  /* All styles are unchanged */
  .document-layout-container {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: var(--space-xxl) var(--space-md) 50vh var(--space-md);
  }
  :global(.prose) {
    font-family: var(--font-main);
    color: var(--color-text);
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-xl) var(--space-xxl);
    min-height: 100vh;
    outline: none;
    background-color: var(--color-background);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-gray-100);
    box-shadow: var(--shadow-md);
  }
</style>
