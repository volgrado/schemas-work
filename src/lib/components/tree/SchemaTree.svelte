<script module lang="ts">
  /**
   * @interface TreeNodeData
   * Defines the public interface for a node in the tree.
   */
  export interface TreeNodeData {
    id: string;
    content: string;
    children?: TreeNodeData[];
  }
</script>

<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'; // <-- 1. IMPORT TICK
  import * as d3 from 'd3';

  // Use $props() for Svelte 5 props
  let {
    treeData,
    selectedNodeId,
  }: {
    treeData: TreeNodeData | null;
    selectedNodeId: string | null;
  } = $props();

  const dispatch = createEventDispatcher<{ nodeClick: { id: string } }>();

  // --- State managed by Svelte 5 Runes ---
  let svgEl = $state<SVGSVGElement | undefined>();
  let gEl = $state<SVGGElement | undefined>();
  let rootNode = $state<d3.HierarchyNode<TreeNodeData> | null>(null);
  let expandedNodeIds = $state<Set<string>>(new Set(['root-title']));

  // --- Constants ---
  const nodeWidth = 140;
  const nodeHeight = 40;
  const transitionDuration = 300;

  // Type alias for cleaner code
  type PointNode = d3.HierarchyPointNode<TreeNodeData> & {
    x0?: number;
    y0?: number;
    _children?: d3.HierarchyNode<TreeNodeData>[];
  };

  // --- D3 setup effect ---
  $effect(() => {
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('class', 'content-group');
    gEl = g.node()!;
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));
    svg.call(zoomBehavior).on('dblclick.zoom', null);
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries?.[0] || !gEl) return;
      const { height } = entries[0].contentRect;
      const initialTransform = d3.zoomIdentity.translate(80, height / 2);
      svg.call(zoomBehavior.transform, initialTransform);
    });
    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });

  // --- Data processing effect ---
  $effect(() => {
    if (!treeData) {
      rootNode = null;
      return;
    }
    const root = d3.hierarchy(treeData);
    (root as PointNode).x0 = 0;
    (root as PointNode).y0 = 0;
    root.descendants().forEach((d) => {
      const node = d as PointNode;
      if (node.children && !expandedNodeIds.has(node.data.id)) {
        node._children = node.children;
        node.children = undefined;
      }
    });
    rootNode = root;
  });

  // --- Drawing effect ---
  $effect(() => {
    if (!rootNode || !gEl) {
      if (gEl) d3.select(gEl).selectAll('*').remove();
      return;
    }
    // <-- 2. WRAP THE UPDATE CALL IN TICK()
    // This ensures Svelte has finished its DOM updates before D3 tries to manipulate it.
    tick().then(() => {
      update(rootNode as PointNode);
    });
  });

  // --- Selection effect ---
  $effect(() => {
    if (!gEl) return;
    d3.select(gEl)
      .selectAll<SVGGElement, PointNode>('g.node')
      .classed('is-selected', (d) => d.data.id === selectedNodeId);
  });

  /**
   * The D3 update function.
   */
  function update(source: PointNode) {
    if (!gEl || !rootNode) return;

    const g = d3.select(gEl);
    const dx = nodeHeight + 20;
    const dy = nodeWidth + 60;
    const treeLayout = d3.tree<TreeNodeData>().nodeSize([dx, dy]);
    const layoutRoot = treeLayout(rootNode);
    const nodes = layoutRoot.descendants().reverse() as PointNode[];
    const links = layoutRoot.links();
    const transition = d3.transition().duration(transitionDuration);

    const node = g
      .selectAll<SVGGElement, PointNode>('g.node')
      .data(nodes, (d) => d.data.id);

    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', `translate(${source.y0 ?? 0},${source.x0 ?? 0})`)
      .attr('opacity', 0)
      .on('click', (event: MouseEvent, d: PointNode) => {
        if (d.children) {
          d._children = d.children;
          d.children = undefined;
          expandedNodeIds.delete(d.data.id);
        } else {
          d.children = d._children as PointNode[] | undefined;
          d._children = undefined;
          expandedNodeIds.add(d.data.id);
        }
        update(d);
      })
      .on('dblclick', (event: MouseEvent, d: PointNode) => {
        event.stopPropagation();
        dispatch('nodeClick', { id: d.data.id });
      })
      .on('mouseover', (event: MouseEvent, d: PointNode) => {
        const allNodes = g.selectAll<SVGGElement, PointNode>('g.node');
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
      })
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
      .html((d: PointNode) => d.data.content);
    nodeEnter.append('circle').attr('class', 'indicator').attr('r', 4);

    const nodeUpdate = node.merge(nodeEnter);
    nodeUpdate.select('div.node-label').html((d: PointNode) => d.data.content);
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
      .attr('transform', `translate(${source.y ?? 0},${source.x ?? 0})`)
      .attr('opacity', 0);

    const link = g
      .selectAll<
        SVGPathElement,
        d3.HierarchyPointLink<TreeNodeData>
      >('path.link')
      .data(links, (d) => d.target.data.id);

    function customLinkGenerator(d: d3.HierarchyPointLink<TreeNodeData>) {
      const startX = (d.source.y ?? 0) + nodeWidth;
      const startY = d.source.x ?? 0;
      const endX = d.target.y ?? 0;
      const endY = d.target.x ?? 0;
      const midX = startX + (endX - startX) / 2;
      return `M ${startX},${startY} C ${midX},${startY} ${midX},${endY} ${endX},${endY}`;
    }

    const linkEnter = link
      .enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const o = { x: source.x0 ?? 0, y: source.y0 ?? 0 };
        return customLinkGenerator({ source: o, target: o } as any);
      });
    link.merge(linkEnter).transition(transition).attr('d', customLinkGenerator);
    link
      .exit()
      .transition(transition)
      .remove()
      .attr('d', () => {
        const o = { x: source.x ?? 0, y: source.y ?? 0 };
        return customLinkGenerator({ source: o, target: o } as any);
      });

    layoutRoot.each((d) => {
      const node = d as PointNode;
      node.x0 = node.x;
      node.y0 = node.y;
    });
  }
</script>

<div class="tree-container" role="tree" aria-label="Schema visualization">
  <svg bind:this={svgEl} class="tree-svg" />
</div>

<style>
  /* Your existing <style> block is perfect and does not need to be changed. */
  .tree-container,
  .tree-svg {
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
  }
  .tree-container:active {
    cursor: grabbing;
  }
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
