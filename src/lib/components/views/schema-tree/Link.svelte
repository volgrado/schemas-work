<!-- src/lib/components/views/schema-tree/Link.svelte -->
<script lang="ts">
  import type { d3 } from 'd3';
  import type { TreeNodeData } from '$lib/types';
  import { nodeWidth } from './tree-layout';

  let { link }: { link: d3.HierarchyPointLink<TreeNodeData> } = $props();

  function customLinkGenerator(d: d3.HierarchyPointLink<TreeNodeData>) {
    const startX = d.source.y + nodeWidth;
    const startY = d.source.x;
    const endX = d.target.y;
    const endY = d.target.x;
    const midX = startX + (endX - startX) / 2;
    return `M ${startX},${startY} C ${midX},${startY} ${midX},${endY} ${endX},${endY}`;
  }
</script>

<path class="link" d={customLinkGenerator(link)} />
