<!--
  @component
  TTSAutoFollowController

  @description
  A headless utility component that keeps the Node Detail Panel synchronized
  with the Text-to-Speech (TTS) playback.

  Logic:
  - Monitors `ttsState.activeTreeNodeId`.
  - When the active node changes during playback, it automatically updates the content
    of the Node Detail Panel to show the new section.
  - Extracts the relevant content slice from the main editor document.
  - Respects user context: only auto-updates if the panel is already open and the user
    is in Tree View (not Editor View).
-->
<script lang="ts">
  import { ttsState } from '$lib/modules/tts/ui/ttsStore.svelte';
  import { editorState } from '$lib/modules/editor/ui/editorStore.svelte';
  import { uiState } from '$lib/stores/uiStore.svelte';
  import { nodeDetailState, openPanel } from '$lib/stores/nodeDetailStore.svelte';
  import { extractContentWithPositions } from '$lib/utils/contentExtraction';
  import type { Node as ProseMirrorNode } from 'prosemirror-model';

  // --- Effect: Auto-Follow Logic ---
  $effect(() => {
    // Guard: Only run if TTS is active
    if (ttsState.status === 'idle') return;
    
    const activeTreeNodeId = ttsState.activeTreeNodeId;

    // Guard: Avoid redundant updates
    if (!activeTreeNodeId || activeTreeNodeId === nodeDetailState.activeNodeId) return;

    // Guard: Do not auto-open/update if in Editor View (distracting)
    if (uiState.activeView === 'editor') return;

    // Guard: Only update if the user has the panel open
    if (!nodeDetailState.isOpen) return;

    const { instance: editor } = editorState;
    if (!editor) return;

    // 1. Locate the new heading in the ProseMirror document
    let headingNode: ProseMirrorNode | null = null;
    let headingPos = -1;
    
    editor.state.doc.descendants((pmNode: ProseMirrorNode, pos: number) => {
      if (pmNode.attrs.nodeId === activeTreeNodeId && pmNode.type.name.startsWith('heading')) {
        headingNode = pmNode;
        headingPos = pos;
        return false; // Stop search
      }
    });

    if (!headingNode) return;

    const typedHeadingNode = headingNode as ProseMirrorNode;
    const title = typedHeadingNode.textContent;

    // 2. Determine the content range for this section
    let endPos = editor.state.doc.content.size;
    const currentLevel = typedHeadingNode.attrs.level;
    let foundNextHeading = false;

    const startPos = headingPos + typedHeadingNode.nodeSize;

    // Scan forward to find the next heading of equal or higher level (end of section)
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

    // 3. Extract HTML content with position metadata for highlighting
    const content = extractContentWithPositions(
      editor.state.doc,
      startPos,
      endPos,
      editor.state.schema
    );

    // 4. Update the panel via the store action
    openPanel(activeTreeNodeId, title, content, startPos, endPos);
  });
</script>

<!-- Headless: No visual output -->
