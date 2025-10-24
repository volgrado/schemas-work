<!--
  @component
  NodeSelectorModal

  A modal dialog that allows the user to select a specific content node (a `listItem`) from any
  document in their entire collection. This is used for re-linking a flashcard to a new source node.

  It works by:
  1. Fetching all documents.
  2. For each document, it loads the Yjs document and traverses the ProseMirror XML structure
     to find all `listItem` nodes that have a `nodeId`.
  3. It then displays a grouped list of these nodes, organized by their parent document.

  Props:
  - `show`: {boolean} - Controls the visibility of the modal.
  - `onselect`: {(detail: { nodeId: string; nodeText: string }) => void} - Callback fired when a node is selected.
  - `onclose`: {() => void} - Callback fired when the modal is closed.
-->
<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import * as directoryService from '$lib/services/core/directoryService';
  import { getDocumentProvider } from '$lib/services/core/persistenceService';
  import type { SchemaMetadata } from '$lib/types';
  import { toast } from 'svelte-sonner';
  import * as Y from 'yjs';

  type Events = {
    select: (detail: { nodeId: string; nodeText: string }) => void;
    close: () => void;
  };

  let {
    /**
     * @prop {boolean} show
     * Controls the visibility of the modal.
     */
    show,
    /**
     * @prop {(detail: { nodeId: string; nodeText: string }) => void} [onselect]
     * Callback fired when a node is selected.
     */
    onselect,
    /**
     * @prop {() => void} [onclose]
     * Callback fired when the modal is closed.
     */
    onclose,
  } = $props<{
    show: boolean;
    onselect?: Events['select'];
    onclose?: Events['close'];
  }>();

  type NodeInfo = { id: string; text: string };
  type DocWithNodes = { doc: SchemaMetadata; nodes: NodeInfo[] };

  let docsWithNodes = $state<DocWithNodes[]>([]);
  let isLoading = $state(true);
  let hasLoaded = false;

  async function loadAllNodes() {
    if (hasLoaded) return;
    isLoading = true;
    try {
      const allItems = await directoryService.getAllItems();
      const schemas = allItems.filter((item) => item.type === 'schema');

      const promises = schemas.map(async (docMeta) => {
        const { ydoc, provider } = getDocumentProvider(docMeta.id);
        await provider.whenSynced;
        const prosemirrorXmlFragment = ydoc.get('prosemirror');
        const nodes: NodeInfo[] = [];

        function findListItems(element: Y.XmlFragment | Y.XmlElement) {
          for (const child of element.toArray()) {
            if (child instanceof Y.XmlElement) {
              if (
                child.nodeName === 'list_item' &&
                child.getAttribute('nodeId')
              ) {
                const text =
                  child.toString().trim().substring(0, 100) || '(Empty Node)';
                nodes.push({ id: child.getAttribute('nodeId')!, text });
              }
              findListItems(child);
            }
          }
        }

        if (prosemirrorXmlFragment instanceof Y.XmlFragment) {
          findListItems(prosemirrorXmlFragment);
        }

        provider.destroy();
        return { doc: docMeta, nodes };
      });

      docsWithNodes = (await Promise.all(promises)).filter(
        (d) => d.nodes.length > 0
      );
    } catch (error) {
      console.error('Failed to load nodes:', error);
      toast.error('Could not load all document nodes.');
    } finally {
      isLoading = false;
      hasLoaded = true;
    }
  }

  $effect(() => {
    if (show && !hasLoaded) {
      loadAllNodes();
    }
  });

  function handleSelect(node: NodeInfo) {
    // Directly call the 'onselect' prop function with the detail object
    onselect?.({ nodeId: node.id, nodeText: node.text });
  }

  function handleClose() {
    // Directly call the 'onclose' prop function
    onclose?.();
  }
</script>

<Modal title="Select New Source Node" {show} onClose={handleClose}>
  <div class="node-selector">
    {#if isLoading}
      <p>Loading documents and nodes...</p>
    {:else if docsWithNodes.length === 0}
      <p>No valid nodes found in any document.</p>
    {:else}
      {#each docsWithNodes as docGroup (docGroup.doc.id)}
        <div class="doc-group">
          <h4>{docGroup.doc.title}</h4>
          <ul>
            {#each docGroup.nodes as node (node.id)}
              <li>
                <button onclick={() => handleSelect(node)} class="node-button">
                  {node.text}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    {/if}
  </div>
</Modal>

<style>
  .node-selector {
    max-height: 60vh;
    overflow-y: auto;
  }
  .doc-group h4 {
    margin: var(--space-md) 0 var(--space-sm);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-xs);
    position: sticky;
    top: -16px; /* Adjust based on modal padding */
    background-color: var(--color-background);
  }
  ul {
    list-style: none;
    padding: 0;
  }
  .node-button {
    width: 100%;
    padding: var(--space-sm);
    border-radius: var(--space-xs);
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
    font-size: inherit;
    color: inherit;
    transition: background-color 0.15s ease;
  }
  .node-button:hover {
    background-color: var(--btn-hover-bg);
  }
</style>
