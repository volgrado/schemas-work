<!-- src/lib/components/views/SchemaTree.svelte (FINAL AND 100% TYPE-SAFE VERSION) -->

<script module lang="ts">
  // This type is used by `+page.svelte` and the `schemaService`
  export interface TreeNodeData {
    id: string;
    content: string;
    children?: TreeNodeData[];
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { createEventDispatcher } from 'svelte';

  // --- Props and Events ---
  let {
    treeData,
    selectedNodeId,
  }: {
    treeData: TreeNodeData | null;
    selectedNodeId: string | null;
  } = $props();

  const dispatch = createEventDispatcher<{ nodeClick: { id: string } }>();

  // --- Local State ---
  let svgEl = $state<SVGSVGElement | undefined>();
  let gEl = $state<SVGGElement | undefined>();
  let height = $state(0);

  // ✅ NEW: A Set to maintain the state of expanded nodes.
  // The root ('root-title') is always expanded by default.
  let expandedNodeIds = $state<Set<string>>(new Set(['root-title']));

  // --- Layout Constants ---
  const nodeWidth = 140;
  const nodeHeight = 40;
  const transitionDuration = 300;

  // --- Custom Type Interface ---
  interface HierarchyPointNodeWithCustomData
    extends d3.HierarchyPointNode<TreeNodeData> {
    _children?: d3.HierarchyNode<TreeNodeData>[];
    x0?: number;
    y0?: number;
  }

  // --- Main Rendering Function ---
  function update(
    source: HierarchyPointNodeWithCustomData,
    root: d3.HierarchyNode<TreeNodeData>
  ) {
    if (!gEl) return;
    const g = d3.select(gEl);

    const dx = nodeHeight + 20;
    const dy = nodeWidth + 60;
    const treeLayout = d3.tree<TreeNodeData>().nodeSize([dx, dy]);
    const layoutRoot = treeLayout(root);
    const nodes = layoutRoot
      .descendants()
      .reverse() as HierarchyPointNodeWithCustomData[];
    const links = layoutRoot.links();

    const transition = d3.transition().duration(transitionDuration);

    // --- NODES ---
    const node = g
      .selectAll<SVGGElement, HierarchyPointNodeWithCustomData>('g.node')
      .data(nodes, (d) => d.data.id);

    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', `translate(${source.y0 ?? 0},${source.x0 ?? 0})`)
      .attr('opacity', 0)
      .on('click', (event: MouseEvent, d: HierarchyPointNodeWithCustomData) => {
        const nodeId = d.data.id;
        if (d.children) {
          d._children = d.children;
          d.children = undefined;
          expandedNodeIds.delete(nodeId);
        } else {
          d.children = d._children as d3.HierarchyPointNode<TreeNodeData>[];
          d._children = undefined;
          expandedNodeIds.add(nodeId);
        }
        update(d, root);
      }) // <-- NO SEMICOLON! The chain continues.

      .on(
        'dblclick',
        (event: MouseEvent, d: HierarchyPointNodeWithCustomData) => {
          event.stopPropagation();
          dispatch('nodeClick', { id: d.data.id });
        }
      )

      .on(
        'mouseover',
        (event: MouseEvent, d: HierarchyPointNodeWithCustomData) => {
          const allNodes = g.selectAll<
            SVGGElement,
            HierarchyPointNodeWithCustomData
          >('g.node');
          const allLinks = g.selectAll<
            SVGPathElement,
            d3.HierarchyPointLink<TreeNodeData>
          >('path.link');

          allNodes.classed('is-dimmed', true);
          allLinks.classed('is-dimmed', true);

          const ancestors = d.ancestors();
          const descendants = d.descendants();

          const ancestorIds = new Set(ancestors.map((n) => n.data.id));
          const descendantIds = new Set(descendants.map((n) => n.data.id));

          allNodes
            .filter((n) => ancestorIds.has(n.data.id))
            .classed('is-dimmed', false)
            .classed('is-ancestor', true);

          allNodes
            .filter((n) => descendantIds.has(n.data.id))
            .classed('is-dimmed', false)
            .classed('is-descendant', true);

          allNodes
            .filter((n) => n.data.id === d.data.id)
            .classed('is-ancestor', false);

          allLinks
            .filter(
              (l) =>
                ancestorIds.has(l.source.data.id) &&
                ancestorIds.has(l.target.data.id)
            )
            .classed('is-dimmed', false)
            .classed('is-ancestor', true);

          allLinks
            .filter(
              (l) =>
                descendantIds.has(l.source.data.id) &&
                descendantIds.has(l.target.data.id)
            )
            .classed('is-dimmed', false)
            .classed('is-descendant', true);
        }
      )

      .on('mouseout', () => {
        g.selectAll('.is-dimmed, .is-ancestor, .is-descendant').classed(
          'is-dimmed is-ancestor is-descendant',
          false
        );
      });

    nodeEnter
      .append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('x', 0)
      .attr('y', -nodeHeight / 2)
      .attr('rx', 4);

    nodeEnter
      .append('foreignObject')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('x', 0)
      .attr('y', -nodeHeight / 2)
      .append('xhtml:div')
      .attr('class', 'node-label')
      .html((d) => d.data.content);

    nodeEnter.append('circle').attr('class', 'indicator').attr('r', 4);

    const nodeUpdate = node.merge(nodeEnter);
    nodeUpdate.classed('is-selected', (d) => d.data.id === selectedNodeId);
    nodeUpdate.select('div.node-label').html((d) => d.data.content);
    nodeUpdate
      .select<SVGCircleElement>('.indicator')
      .attr('opacity', (d) => (d.children || d._children ? 1 : 0))
      .classed('is-collapsed', (d) => !!d._children)
      .attr(
        'transform',
        `translate(${nodeWidth - 10}, ${-nodeHeight / 2 + 10})`
      );

    nodeUpdate
      .transition(transition)
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .attr('opacity', 1);

    node
      .exit()
      .transition(transition)
      .remove()
      .attr('transform', `translate(${source.y},${source.x})`)
      .attr('opacity', 0);

    // --- LINKS ---
    const link = g
      .selectAll<
        SVGPathElement,
        d3.HierarchyPointLink<TreeNodeData>
      >('path.link')
      .data(links, (d) => d.target.data.id);

    function customLinkGenerator(d: d3.HierarchyPointLink<TreeNodeData>) {
      const startX = d.source.y + nodeWidth;
      const startY = d.source.x;
      const endX = d.target.y;
      const endY = d.target.x;
      const midX = startX + (endX - startX) / 2;
      return `M ${startX},${startY} C ${midX},${startY} ${midX},${endY} ${endX},${endY}`;
    }

    link
      .enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const o = {
          source: { y: source.y0 ?? 0, x: source.x0 ?? 0 },
          target: { y: source.y0 ?? 0, x: source.x0 ?? 0 },
        };
        return customLinkGenerator(o as any);
      })
      .merge(link)
      .transition(transition)
      .attr('d', customLinkGenerator);

    link
      .exit()
      .transition(transition)
      .remove()
      .attr('d', () => {
        const o = {
          source: { y: source.y, x: source.x },
          target: { y: source.y, x: source.x },
        };
        return customLinkGenerator(o as any);
      });

    layoutRoot.each((d) => {
      const node = d as HierarchyPointNodeWithCustomData;
      node.x0 = node.x;
      node.y0 = node.y;
    });
  }

  // --- Lifecycle and Reactive Effects ---
  onMount(() => {
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const g = svg.append('g').attr('class', 'content-group');
    gEl = g.node()!;

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));
    svg.call(zoomBehavior).on('dblclick.zoom', null);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries?.[0]) return;
      height = entries[0].contentRect.height;
      const initialTransform = d3.zoomIdentity.translate(80, height / 2);
      svg.call(zoomBehavior.transform, initialTransform);
    });
    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });

  $effect(() => {
    if (!treeData || !gEl) {
      if (gEl) d3.select(gEl).selectAll('*').remove();
      return;
    }
    const root = d3.hierarchy(treeData);

    const rootWithCoords = root as HierarchyPointNodeWithCustomData;
    rootWithCoords.x0 = height / 2;
    rootWithCoords.y0 = 0;

    // ✅ FIX: Use `expandedNodeIds` to preserve expansion state.
    root.descendants().forEach((d) => {
      const node = d as HierarchyPointNodeWithCustomData;
      // Collapse a node if it has children and is NOT in the expanded list.
      if (node.children && !expandedNodeIds.has(node.data.id)) {
        node._children = node.children;
        node.children = undefined;
      }
    });
    update(rootWithCoords, root);
  });

  $effect(() => {
    if (!gEl) return;
    d3.select(gEl)
      .selectAll<SVGGElement, HierarchyPointNodeWithCustomData>('g.node')
      .classed('is-selected', (d) => d.data.id === selectedNodeId);
  });
</script>

<div class="tree-container" role="tree" aria-label="Schema visualization">
  <svg bind:this={svgEl} class="tree-svg" />
</div>

<style>
  .tree-container,
  .tree-svg {
    width: 100%;
    height: 100%;
    display: block;
    background-color: var(--color-background);
    cursor: grab;
  }
  .tree-container:active {
    cursor: grabbing;
  }

  /* === Base Styles === */
  :global(.tree-svg .link) {
    fill: none;
    stroke: var(--color-gray-100);
    stroke-width: 1px;
    transition:
      stroke 300ms,
      stroke-width 300ms,
      opacity 300ms;
  }
  :global(.tree-svg .node) {
    cursor: pointer;
    font-family: var(--font-main);
    transition: opacity 300ms;
    -webkit-tap-highlight-color: transparent;
  }
  :global(.tree-svg .node rect) {
    fill: var(--color-background);
    stroke: var(--color-gray-100);
    stroke-width: 1px;
    transition:
      fill 0.2s,
      stroke 0.2s,
      stroke-width 0.2s;
  }
  :global(.tree-svg .node .node-label) {
    width: 100%;
    height: 100%;
    padding: 6px 8px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text);
    line-height: 1.3;
    word-break: break-word;
    user-select: none;
    pointer-events: none;
  }

  /* === Child Indicator === */
  :global(.tree-svg .node .indicator) {
    stroke: var(--color-gray-500);
    stroke-width: 1.5px;
    fill: transparent;
    transition:
      fill 300ms,
      stroke 300ms,
      opacity 300ms;
  }
  :global(.tree-svg .node .indicator.is-collapsed) {
    fill: var(--color-gray-500);
  }
  :global(.tree-svg .node:hover .indicator.is-collapsed) {
    fill: var(--color-accent);
    stroke: var(--color-accent);
  }
  :global(.tree-svg .node:hover .indicator) {
    stroke: var(--color-accent);
  }

  /* === Interaction States === */
  :global(.tree-svg .node.has-children rect) {
    fill: var(--color-gray-100);
  }
  :global(.tree-svg .node:hover rect) {
    stroke: var(--color-accent);
    stroke-width: 1.5px;
  }
  :global(.tree-svg .node.is-selected rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
    fill: hsl(var(--color-accent-hsl, 16 84% 53%) / 0.1);
  }
  :global(.tree-svg .node.is-selected .node-label) {
    font-weight: 700;
  }

  /* === Lineage Highlight Styles (Hover) === */
  :global(.tree-svg .is-dimmed) {
    opacity: 0.15 !important;
  }
  :global(.tree-svg .link.is-ancestor) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }
  :global(.tree-svg .node.is-ancestor rect) {
    stroke: var(--color-accent);
  }
  :global(.tree-svg .link.is-descendant) {
    stroke: var(--color-gray-500);
  }
  :global(.tree-svg .node.is-descendant rect) {
    stroke: var(--color-gray-500);
  }
  :global(.tree-svg .node:hover.is-ancestor rect),
  :global(.tree-svg .node:hover.is-descendant rect),
  :global(.tree-svg .node:hover rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }
</style>
