<!-- src/lib/components/views/schema-tree/Node.svelte -->
<script lang="ts">
  import type { HierarchyPointNodeWithCustomData } from './tree-layout';
  import { nodeWidth, nodeHeight } from './tree-layout';

  let {
    node,
    selectedNodeId,
  }: { node: HierarchyPointNodeWithCustomData; selectedNodeId: string | null } =
    $props();
</script>

<g class="node" transform="translate({node.y}, {node.x})">
  <rect
    width={nodeWidth}
    height={nodeHeight}
    x={0}
    y={-nodeHeight / 2}
    rx={4}
    class:is-selected={node.data.id === selectedNodeId}
  />
  <foreignObject
    width={nodeWidth}
    height={nodeHeight}
    x={0}
    y={-nodeHeight / 2}
  >
    <div class="node-label">
      {node.data.content}
    </div>
  </foreignObject>
  <circle
    class="indicator"
    r={4}
    style:opacity={node.children || node._children ? 1 : 0}
    class:is-collapsed={!!node._children}
    transform="translate({nodeWidth - 10}, {-nodeHeight / 2 + 10})"
  />
</g>
