<!--
  @component
  TiptapPreview

  @description
  A lightweight, read-only Tiptap editor instance used to visualize document content
  within a modal or sidebar.

  Use Cases:
  - **AI Strategy Session:** Showing a preview of the document to allow the user to select
    a specific text range for refinement.
  - **Review:** Displaying document context without enabling full editing capabilities.

  Features:
  - **Selection API:** Exposes `getCurrentSelection()` to allow parent components to retrieve
    the user's highlighted text range imperatively.
  - **Read-Only:** Configured with `editable: false`.
  - **Minimal Extensions:** Loads only the essential extensions (StarterKit) for performance.

  @props
  - `content` (object | null): The Tiptap JSON content to render.
-->
<script lang="ts">
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Heading from '@tiptap/extension-heading';
  import { Table } from '@tiptap/extension-table';
  import { TableRow } from '@tiptap/extension-table-row';
  import { TableCell } from '@tiptap/extension-table-cell';
  import { TableHeader } from '@tiptap/extension-table-header';
  import Blockquote from '@tiptap/extension-blockquote';
  import BulletList from '@tiptap/extension-bullet-list';
  import OrderedList from '@tiptap/extension-ordered-list';
  import ListItem from '@tiptap/extension-list-item';

  // --- Props ---
  const { content } = $props<{
    content: object | null;
  }>();

  // --- State ---
  let element = $state<HTMLDivElement | null>(null);
  let editor = $state<Editor | null>(null);

  // Extend Heading to support 'nodeId' attribute, ensuring consistent parsing
  // with the main editor schema.
  const CustomHeading = Heading.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        nodeId: { default: null },
      };
    },
  });

  // --- Public API ---

  /**
   * Retrieves the current text selection from the preview editor.
   * Used by the parent (e.g., StrategySessionModal) to get the context for AI commands.
   *
   * @returns An object containing the range and text, or null if no selection.
   */
  export function getCurrentSelection(): {
    from: number;
    to: number;
    text: string;
  } | null {
    if (!editor || editor.state.selection.empty) {
      return null;
    }
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    return { from, to, text };
  }

  // --- Lifecycle ---

  // Initialize Editor
  $effect(() => {
    if (!element) return;
    const editorInstance = new Editor({
      element: element,
      editable: false, // Read-only mode
      extensions: [
        StarterKit.configure({
          heading: false, // Disable default heading to use ours
        }),
        CustomHeading,
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
      content: content ? $state.snapshot(content) : {},
    });
    editor = editorInstance;

    return () => {
      editor?.destroy();
      editor = null;
    };
  });

  // Sync Content
  $effect(() => {
    if (editor && content) {
      // Only update if content actually changed to avoid cursor jumps (even in read-only)
      if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
        editor.commands.setContent($state.snapshot(content), { emitUpdate: false });
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
  }

  /* Enable text selection even in read-only mode */
  :global(.prose .ProseMirror) {
    user-select: text;
  }

  /* Custom selection color */
  :global(.prose ::selection) {
    background-color: hsl(var(--color-accent-hsl) / 0.4);
  }

  :global(.prose blockquote) {
    border-left: 3px solid var(--color-border);
    padding-left: 1rem;
    margin-left: 0.5rem;
    color: var(--color-text-secondary);
  }

  :global(.dark-theme) .prose {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme .prose blockquote) {
    border-color: var(--color-border-dark);
  }
</style>
