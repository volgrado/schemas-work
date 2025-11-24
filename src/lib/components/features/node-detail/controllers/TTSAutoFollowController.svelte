<script lang="ts">
  import { ttsState } from '$lib/stores/ttsStore.svelte';
  import { editorState } from '$lib/stores/editorStore.svelte';
  import { uiState } from '$lib/stores/uiStore.svelte';
  import { nodeDetailState, openPanel } from '$lib/stores/nodeDetailStore.svelte';
  import { extractContentWithPositions } from '$lib/utils/contentExtraction';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';

  /**
   * Effect for auto-follow: update panel content when TTS changes nodes.
   */
  $effect(() => {
    // Always follow TTS if playing
    if (ttsState.status === 'idle') return;
    
    const activeTreeNodeId = ttsState.activeTreeNodeId;
    if (!activeTreeNodeId || activeTreeNodeId === nodeDetailState.activeNodeId) return;

    // Do not auto-open the panel if we are in Editor View.
    if (uiState.activeView === 'editor') return;

    // Only update the panel if it's already open.
    if (!nodeDetailState.isOpen) return;

    // Auto-update the panel to follow TTS
    const { instance: editor } = editorState;
    if (!editor) return;

    // Get the heading node from the editor
    let headingNode: ProseMirrorNode | null = null;
    let headingPos = -1;
    
    editor.state.doc.descendants((pmNode: ProseMirrorNode, pos: number) => {
      if (pmNode.attrs.nodeId === activeTreeNodeId && pmNode.type.name.startsWith('heading')) {
        headingNode = pmNode;
        headingPos = pos;
        return false;
      }
    });

    if (!headingNode) return;

    const typedHeadingNode = headingNode as ProseMirrorNode;
    const title = typedHeadingNode.textContent;

    // Extract content
    let endPos = editor.state.doc.content.size;
    const currentLevel = typedHeadingNode.attrs.level;
    let foundNextHeading = false;

    const startPos = headingPos + typedHeadingNode.nodeSize;

    editor.state.doc.nodesBetween(
      startPos,
      editor.state.doc.content.size,
      (pmNode: ProseMirrorNode, pos: number) => {
        if (foundNextHeading) return false;

        if (pmNode.type.name === 'heading') {
          if (pmNode.attrs.level <= currentLevel) {
            endPos = pos;
            foundNextHeading = true;
            return false;
          }
        }
      }
    );

    const content = extractContentWithPositions(
      editor.state.doc,
      startPos,
      endPos,
      editor.state.schema
    );

    openPanel(activeTreeNodeId, title, content, startPos, endPos);
  });
</script>

<!-- Headless component -->
