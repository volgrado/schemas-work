<!--
  src/lib/components/visualization/Treemap.svelte
  A treemap visualization where area corresponds to word count.
-->
<script module lang="ts">
  import type { TreeNodeData } from './StandardTree.svelte';
  import type { HierarchyRectangularNode } from 'd3-hierarchy';
  
  // Type for nodes after treemap layout (includes x0, y0, x1, y1)
  type TreemapNode = HierarchyRectangularNode<TreeNodeData>;
</script>

<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { select } from 'd3-selection';
  import { hierarchy, treemap } from 'd3-hierarchy';
  import { scaleOrdinal } from 'd3-scale';
  import { schemeTableau10 } from 'd3-scale-chromatic';
  import 'd3-transition';

  // =================================================================
  // COMPONENT PROPERTIES
  // =================================================================
  let {
    treeData,
    selectedNodeId,
  }: {
    treeData: TreeNodeData | null;
    selectedNodeId: string | null;
  } = $props();

  const dispatch = createEventDispatcher<{ nodeClick: { id: string } }>();

  let svgEl = $state<SVGSVGElement | undefined>();
  let width = $state(0);
  let height = $state(0);

  // =================================================================
  // EFFECTS
  // =================================================================

  $effect(() => {
    if (!svgEl) return;
    // Use the parent container (.treemap-container) for size calculations
    // This accounts for padding in the parent
    const container = svgEl.parentElement;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const rect = entries[0].contentRect;
      width = rect.width;
      height = rect.height;
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  });

  $effect(() => {
    if (!treeData || !svgEl || width === 0 || height === 0) return;
    // Debounce slightly to avoid rapid re-renders during resize
    const timer = setTimeout(() => {
      update(treeData!);
    }, 100);
    return () => clearTimeout(timer);
  });

  // =================================================================
  // DRAWING LOGIC
  // =================================================================

  function update(data: TreeNodeData) {
    if (!svgEl) return;
    const svg = select(svgEl);
    svg.selectAll('*').remove();

    const root = hierarchy(data)
      .sum((d) => d.value || 0) // Use word count
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treeMapLayout = treemap<TreeNodeData>()
      .size([width, height])
      .paddingOuter(4)
      .paddingTop(20)
      .paddingInner(2)
      .round(true);

    const layoutRoot = treeMapLayout(root) as TreemapNode;

    const colorScale = scaleOrdinal(schemeTableau10);

    // Render Groups (Leaves and Parents)
    // We render all nodes to show nesting
    const nodes = svg
      .selectAll('g')
      .data(layoutRoot.descendants() as TreemapNode[])
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

    // Rectangles
    nodes
      .append('rect')
      .attr('id', (d) => `rect-${d.data.id}`)
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => d.y1 - d.y0)
      .attr('fill', (d) => {
        // Color by top-level parent to distinguish sections
        let ancestor = d;
        while (ancestor.depth > 1) ancestor = ancestor.parent!;
        return colorScale(ancestor.data.id);
      })
      .attr('fill-opacity', (d) => (d.children ? 0.1 : 0.6)) // Parents transparent, leaves opaque
      .attr('stroke', 'var(--color-background)')
      .attr('stroke-width', 1)
      .attr('class', 'node-rect')
      .classed('is-selected', (d) => d.data.id === selectedNodeId)
      .on('click', (event, d) => {
        event.stopPropagation();
        dispatch('nodeClick', { id: d.data.id });
      });

    // Labels (Only for nodes with enough space)
    nodes
      .append('text')
      .attr('x', 4)
      .attr('y', 14)
      .text((d) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        // Only show text if box is big enough
        return w > 50 && h > 20 ? d.data.content : '';
      })
      .attr('font-size', '11px')
      .attr('fill', (d) => d.children ? 'var(--color-text)' : '#fff')
      .attr('font-weight', (d) => d.children ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .each(function(d) {
         // Truncate text if it overflows
         const self = select(this);
         const w = d.x1 - d.x0 - 8;
         const node = self.node();
         if (!node) return;
         let textLength = node.getComputedTextLength();
         let text = self.text();
         while (textLength > w && text.length > 0) {
           text = text.slice(0, -1);
           self.text(text + '...');
           const updatedNode = self.node();
           if (!updatedNode) break;
           textLength = updatedNode.getComputedTextLength();
         }
      });

    // Tooltips (Simple title attribute for now)
    nodes.append('title').text((d) => `${d.data.content}\nWords: ${d.value}`);
  }
</script>

<div class="treemap-container">
  <svg bind:this={svgEl} class="treemap-svg"></svg>
</div>

<style>
  .treemap-container, .treemap-svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: hidden;
  }

  /* Ensure treemap doesn't render behind header */
  :global(.main-content.is-tree-view) .treemap-container {
    height: calc(100% - var(--height-header));
  }

  :global(.treemap-svg .node-rect) {
    cursor: pointer;
    transition: fill-opacity 0.2s, stroke-width 0.2s;
  }

  :global(.treemap-svg .node-rect:hover) {
    fill-opacity: 0.8;
    stroke: var(--color-text);
    stroke-width: 2px;
  }

  :global(.treemap-svg .node-rect.is-selected) {
    stroke: var(--color-accent);
    stroke-width: 3px;
    fill-opacity: 0.9;
  }
</style>
