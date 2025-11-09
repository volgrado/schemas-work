<!--
  @component
  TiptapPreview

  @description
  An exceptional, production-ready preview pane for the AI Workbench. It renders a
  non-editable Tiptap editor and uses a custom `Selection` extension to report user
  text selections back to its parent.

  This component follows the canonical Svelte 5 pattern for managing a third-party
  library, using a self-cleaning `$effect` for the editor's entire lifecycle.

  @props
  - `content`: {object | null} - The Tiptap-compatible JSON content to display.
  - `onSelectionUpdate`: {(from, to, text) => void} - Callback fired when the user selects text.
-->
<script lang="ts">
  import { Editor } from '@tiptap/core';
  import Document from '@tiptap/extension-document';
  import Paragraph from '@tiptap/extension-paragraph';
  import Text from '@tiptap/extension-text';
  import Heading from '@tiptap/extension-heading';
  import { Selection } from '$lib/editor/extensions/Selection';

  // --- Props ---
  let { content, onSelectionUpdate } = $props<{
    content: object | null;
    onSelectionUpdate: (from: number, to: number, text: string) => void;
  }>();

  // --- State ---
  let element = $state<HTMLDivElement | null>(null);
  let editor = $state<Editor | null>(null);

  /**
   * REFACTOR: This single, self-cleaning `$effect` now manages the entire lifecycle
   * of the Tiptap editor instance, replacing `onMount` and `onDestroy`.
   */
  $effect(() => {
    if (!element) return;

    const editorInstance = new Editor({
      element: element,
      editable: false,
      extensions: [
        Document,
        Paragraph,
        Text,
        Heading,
        Selection.configure({
          onSelectionUpdate: ({ editor }) => {
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, ' ');
            onSelectionUpdate(from, to, selectedText);
          },
        }),
      ],
      // Set initial content only on creation.
      content: content || {},
    });

    editor = editorInstance;

    // The return function is the cleanup, which Svelte runs when the component is destroyed.
    return () => {
      editor?.destroy();
      editor = null;
    };
  });

  /**
   * This separate effect is solely responsible for synchronizing the `content` prop
   * with the editor *after* it has been initialized.
   */
  $effect(() => {
    if (editor && content) {
      // Avoid resetting content if the editor is focused, to prevent losing user selection.
      if (!editor.isFocused) {
        const { from, to } = editor.state.selection;
        editor.commands.setContent(content, { emitUpdate: false });
        // Restore the previous selection after updating content.
        editor.commands.setTextSelection({ from, to });
      }
    }
  });
</script>

<div class="prose" bind:this={element}></div>

<style>
  .prose {
    height: 100%;
    overflow-y: auto;
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-sm);
    /* Make the preview pane itself non-interactive for text selection */
    user-select: none;
  }

  /* Tiptap controls the internal content, so we use :global to style its selection color */
  :global(.prose ::selection) {
    background-color: hsl(var(--color-accent-hsl) / 0.4);
  }

  :global(.dark-theme) .prose {
    border-color: var(--color-border-dark);
  }
</style>
