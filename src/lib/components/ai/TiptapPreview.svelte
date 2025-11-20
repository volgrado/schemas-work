<!-- src/lib/components/ai/TiptapPreview.svelte (FINAL ARCHITECTURE) -->
<script lang="ts">
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Heading from '@tiptap/extension-heading';
  // The custom Selection extension is no longer needed as we aren't firing a callback.
  // import { Selection } from '$lib/editor/extensions/Selection';

  // --- Props ---
  // FIX: The onSelectionUpdate prop has been removed.
  let { content } = $props<{
    content: object | null;
  }>();

  // --- State ---
  let element = $state<HTMLDivElement | null>(null);
  let editor = $state<Editor | null>(null);

  const CustomHeading = Heading.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        nodeId: { default: null },
      };
    },
  });

  // --- FIX: Expose a function for the parent to call ---
  // This is the new component API for getting the selection imperatively.
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

  $effect(() => {
    if (!element) return;
    const editorInstance = new Editor({
      element: element,
      editable: false,
      extensions: [
        StarterKit.configure({
          heading: false, // We use CustomHeading
        }),
        CustomHeading,
      ],
      content: content || {},
    });
    editor = editorInstance;
    return () => {
      editor?.destroy();
      editor = null;
    };
  });

  $effect(() => {
    if (editor && content) {
      if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  });
</script>

<div class="prose" bind:this={element}></div>

<!-- The style section remains the same, with user-select enabled -->
<style>
  .prose {
    height: 100%;
    overflow-y: auto;
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-sm);
  }
  :global(.prose .ProseMirror) {
    user-select: text;
  }
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
