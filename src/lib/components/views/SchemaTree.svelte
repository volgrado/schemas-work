<!-- src/lib/components/views/SchemaTree.svelte -->
<script lang="ts">
  import type { TreeNodeData } from '$lib/types';
  import { createEventDispatcher } from 'svelte';
  import { schemaTreeStore } from '$lib/stores/schemaTreeStore';
  import { createTreeLayout } from './schema-tree/tree-layout';
  import TreeContainer from './schema-tree/TreeContainer.svelte';
  import Node from './schema-tree/Node.svelte';
  import Link from './schema-tree/Link.svelte';

  let {
    treeData,
    selectedNodeId,
  }: {
    treeData: TreeNodeData | null;
    selectedNodeId: string | null;
  } = $props();

  const dispatch = createEventDispatcher<{ nodeClick: { id: string } }>();

  let nodes = [];
  let links = [];

  $effect(() => {
    if (treeData) {
      const { nodes: newNodes, links: newLinks } = createTreeLayout(
        treeData,
        $schemaTreeStore.expandedNodeIds
      );
      nodes = newNodes;
      links = newLinks;
    }
  });
</script>

<TreeContainer>
  {#if treeData}
    <g>
      {#each links as link (link.target.data.id)}
        <Link {link} />
      {/each}
      {#each nodes as node (node.data.id)}
        <g
          on:click={() => schemaTreeStore.toggleNode(node.data.id)}
          on:dblclick|stopPropagation={() => dispatch('nodeClick', { id: node.data.id })}
        >
          <Node {node} {selectedNodeId} />
        </g>
      {/each}
    </g>
  {/if}
</TreeContainer>

<style>
  /* Base styles moved to app.css or a global stylesheet */
</style>
