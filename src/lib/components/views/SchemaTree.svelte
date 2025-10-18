<!--
  @component
  SchemaTree

  This component renders a hierarchical tree structure of a document's schema using D3.js.
  It provides an interactive, visual representation of the nodes within a document,
  allowing users to explore the schema's layout, relationships, and content.

  Features:
  - **D3 Tree Layout**: Uses d3-hierarchy to automatically position nodes in a tidy tree layout.
  - **Interactivity**: 
    - **Zoom & Pan**: The entire tree can be zoomed and panned.
    - **Expand/Collapse**: Nodes can be expanded or collapsed by clicking on them.
    - **Double Click to Navigate**: Double-clicking a node fires an event to navigate to its position in the editor.
    - **Hover Highlighting**: Hovering over a node highlights its ancestors and descendants, clarifying its position in the hierarchy.
  - **State Preservation**: The expanded/collapsed state of nodes is preserved across re-renders.
  - **Selection Highlighting**: The currently selected node (as determined by the parent) is visually highlighted.

  Props:
  - `treeData`: The hierarchical data for the tree, conforming to the `TreeNodeData` interface.
  - `selectedNodeId`: The ID of the node that should be highlighted as currently selected.

  Events:
  - `nodeClick`: Dispatched on double-click, providing the ID of the clicked node.
-->

<script module lang="ts">
  /**
   * @interface TreeNodeData
   * Defines the public interface for a node in the tree. This is used by parent
   * components (`+page.svelte`) and services (`schemaService`) to provide data
   * to this component.
   */
  export interface TreeNodeData {
    id: string; // A unique identifier for the node (e.g., 'root-title' or 'node-123').
    content: string; // The HTML content to be displayed inside the node.
    children?: TreeNodeData[]; // Optional array of child nodes.
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
  let gEl = $state<SVGGElement | undefined>(); // The main <g> element for zooming and panning.
  let height = $state(0); // The height of the SVG container, used for initial positioning.

  // A Set to maintain the state of expanded nodes, preserved across re-renders.
  let expandedNodeIds = $state<Set<string>>(new Set(['root-title']));

  // --- Layout Constants ---
  const nodeWidth = 140;
  const nodeHeight = 40;
  const transitionDuration = 300;

  /**
   * @interface HierarchyPointNodeWithCustomData
   * Extends the D3 hierarchy node type with custom properties needed for animations
   * and managing the collapsed state.
   */
  interface HierarchyPointNodeWithCustomData
    extends d3.HierarchyPointNode<TreeNodeData> {
    _children?: d3.HierarchyNode<TreeNodeData>[]; // Temporary storage for collapsed children.
    x0?: number; // Previous x position for transitions.
    y0?: number; // Previous y position for transitions.
  }

  /**
   * The core D3 rendering function. It calculates the layout and updates the SVG
   * to reflect the current state of the tree data.
   * @param {HierarchyPointNodeWithCustomData} source - The node that was clicked, used as the origin for transitions.
   * @param {d3.HierarchyNode<TreeNodeData>} root - The root of the D3 hierarchy.
   */
  function update(
    source: HierarchyPointNodeWithCustomData,
    root: d3.HierarchyNode<TreeNodeData>
  ) {
    if (!gEl) return;
    const g = d3.select(gEl);

    // Define node and link spacing.
    const dx = nodeHeight + 20;
    const dy = nodeWidth + 60;
    const treeLayout = d3.tree<TreeNodeData>().nodeSize([dx, dy]);
    const layoutRoot = treeLayout(root);
    const nodes = layoutRoot.descendants().reverse() as HierarchyPointNodeWithCustomData[];
    const links = layoutRoot.links();

    const transition = d3.transition().duration(transitionDuration);

    // --- NODES ---
    const node = g
      .selectAll<SVGGElement, HierarchyPointNodeWithCustomData>('g.node')
      .data(nodes, (d) => d.data.id);

    // --- Enter new nodes at the source's previous position.
    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', `translate(${source.y0 ?? 0},${source.x0 ?? 0})`)
      .attr('opacity', 0)
      // Click to expand/collapse
      .on('click', (event: MouseEvent, d: HierarchyPointNodeWithCustomData) => {
        // Toggle collapse/expand state
        if (d.children) {
          // Collapse
          d._children = d.children;
          d.children = undefined;
          expandedNodeIds.delete(d.data.id);
        } else {
          // Expand
          d.children = d._children as d3.HierarchyPointNode<TreeNodeData>[];
          d._children = undefined;
          expandedNodeIds.add(d.data.id);
        }
        update(d, root); // Re-render the tree from the clicked node.
      })
      // Double-click to navigate
      .on(
        'dblclick',
        (event: MouseEvent, d: HierarchyPointNodeWithCustomData) => {
          event.stopPropagation();
          dispatch('nodeClick', { id: d.data.id });
        }
      )
      // Hover to highlight lineage
      .on(
        'mouseover',
        (event: MouseEvent, d: HierarchyPointNodeWithCustomData) => {
          const allNodes = g.selectAll<SVGGElement, HierarchyPointNodeWithCustomData>('g.node');
          const allLinks = g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNodeData>>('path.link');

          // Dim all nodes and links initially.
          allNodes.classed('is-dimmed', true);
          allLinks.classed('is-dimmed', true);

          const ancestors = d.ancestors();
          const descendants = d.descendants();
          const ancestorIds = new Set(ancestors.map((n) => n.data.id));
          const descendantIds = new Set(descendants.map((n) => n.data.id));

          // Highlight ancestors.
          allNodes.filter((n) => ancestorIds.has(n.data.id)).classed('is-dimmed', false).classed('is-ancestor', true);
          // Highlight descendants.
          allNodes.filter((n) => descendantIds.has(n.data.id)).classed('is-dimmed', false).classed('is-descendant', true);
          // Un-style the hovered node itself.
          allNodes.filter((n) => n.data.id === d.data.id).classed('is-ancestor', false);

          // Highlight corresponding links.
          allLinks.filter((l) => ancestorIds.has(l.source.data.id) && ancestorIds.has(l.target.data.id)).classed('is-dimmed', false).classed('is-ancestor', true);
          allLinks.filter((l) => descendantIds.has(l.source.data.id) && descendantIds.has(l.target.data.id)).classed('is-dimmed', false).classed('is-descendant', true);
        }
      )
      // Mouseout to clear all highlights.
      .on('mouseout', () => {
        g.selectAll('.is-dimmed, .is-ancestor, .is-descendant').classed(
          'is-dimmed is-ancestor is-descendant',
          false
        );
      });

    // Append visual elements to the entering nodes.
    nodeEnter.append('rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', 0).attr('y', -nodeHeight / 2).attr('rx', 4);
    nodeEnter.append('foreignObject').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', 0).attr('y', -nodeHeight / 2).append('xhtml:div').attr('class', 'node-label').html((d) => d.data.content);
    nodeEnter.append('circle').attr('class', 'indicator').attr('r', 4);

    // --- Update existing nodes.
    const nodeUpdate = node.merge(nodeEnter);
    nodeUpdate.classed('is-selected', (d) => d.data.id === selectedNodeId);
    nodeUpdate.select('div.node-label').html((d) => d.data.content);
    nodeUpdate.select<SVGCircleElement>('.indicator').attr('opacity', (d) => (d.children || d._children ? 1 : 0)).classed('is-collapsed', (d) => !!d._children).attr('transform', `translate(${nodeWidth - 10}, ${-nodeHeight / 2 + 10})`);

    // Transition nodes to their new position.
    nodeUpdate.transition(transition).attr('transform', (d) => `translate(${d.y},${d.x})`).attr('opacity', 1);

    // --- Exit old nodes.
    node.exit().transition(transition).remove().attr('transform', `translate(${source.y},${source.x})`).attr('opacity', 0);

    // --- LINKS ---
    const link = g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNodeData>>('path.link').data(links, (d) => d.target.data.id);

    // Custom path generator for curved links.
    function customLinkGenerator(d: d3.HierarchyPointLink<TreeNodeData>) {
      const startX = d.source.y + nodeWidth;
      const startY = d.source.x;
      const endX = d.target.y;
      const endY = d.target.x;
      const midX = startX + (endX - startX) / 2;
      return `M ${startX},${startY} C ${midX},${startY} ${midX},${endY} ${endX},${endY}`;
    }

    // Enter new links at the source's previous position.
    link.enter().insert('path', 'g').attr('class', 'link').attr('d', () => {
      const o = { source: { y: source.y0 ?? 0, x: source.x0 ?? 0 }, target: { y: source.y0 ?? 0, x: source.x0 ?? 0 } };
      return customLinkGenerator(o as any);
    }).merge(link).transition(transition).attr('d', customLinkGenerator);

    // Transition exiting links to the source's new position.
    link.exit().transition(transition).remove().attr('d', () => {
      const o = { source: { y: source.y, x: source.x }, target: { y: source.y, x: source.x } };
      return customLinkGenerator(o as any);
    });

    // Stash the old positions for transition.
    layoutRoot.each((d) => {
      const node = d as HierarchyPointNodeWithCustomData;
      node.x0 = node.x;
      node.y0 = node.y;
    });
  }

  // --- Lifecycle and Reactive Effects ---

  // onMount: Initialize D3, zoom behavior, and resize observer.
  onMount(() => {
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const g = svg.append('g').attr('class', 'content-group');
    gEl = g.node()!;

    // Setup zoom and pan.
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 2]).on('zoom', (event) => g.attr('transform', event.transform.toString()));
    svg.call(zoomBehavior).on('dblclick.zoom', null); // Disable zoom on double-click.

    // Center the tree initially and on resize.
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries?.[0]) return;
      height = entries[0].contentRect.height;
      const initialTransform = d3.zoomIdentity.translate(80, height / 2);
      svg.call(zoomBehavior.transform, initialTransform);
    });
    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });

  // $effect: This is the main reactive trigger. It runs whenever `treeData` changes.
  $effect(() => {
    if (!treeData || !gEl) {
      if (gEl) d3.select(gEl).selectAll('*').remove(); // Clear SVG if no data.
      return;
    }
    const root = d3.hierarchy(treeData);

    // Set initial position for the root node for the very first render.
    const rootWithCoords = root as HierarchyPointNodeWithCustomData;
    rootWithCoords.x0 = height / 2;
    rootWithCoords.y0 = 0;

    // Restore the expanded/collapsed state of the tree before rendering.
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

  // $effect: Reactively updates the CSS class for the selected node.
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

  /* === Child Indicator (the small circle) === */
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
    fill: var(--color-gray-500); /* Solid fill indicates it can be expanded */
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

  /* === Lineage Highlight Styles (on Hover) === */
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
  /* Ensure the directly hovered node gets the primary highlight color */
  :global(.tree-svg .node:hover.is-ancestor rect),
  :global(.tree-svg .node:hover.is-descendant rect),
  :global(.tree-svg .node:hover rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }
</style>
