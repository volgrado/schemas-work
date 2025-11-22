<!--
  src/lib/components/visualization/SchemaTree.svelte
  A reactive and interactive tree visualization component.
  - Built with Svelte 5 for reactive state management.
  - Uses D3.js for robust data visualization, layout, and animations.
  - Integrates with application stores for features like text-to-speech
    highlighting and displaying node details in a side panel.
-->
<script module lang="ts">
  /**
   * @interface TreeNodeData
   * Defines the public interface for the data of a single node in the tree.
   */
  export interface TreeNodeData {
    id: string;
    content: string;
    children?: TreeNodeData[];
    value?: number; // Word count or other metric
  }
</script>

<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  // Tree-shaken D3 imports - only import what we need
  import { select } from 'd3-selection';
  import { hierarchy, tree } from 'd3-hierarchy';
  import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
  import { linkHorizontal } from 'd3-shape';
  import 'd3-transition'; // Side-effect import for transition support
  import { ttsState } from '$lib/stores/ttsStore.svelte';
  import { editorState } from '$lib/stores/editorStore.svelte';
  import {
    nodeDetailState,
    openPanel,
    setFlattenedTree,
  } from '$lib/stores/nodeDetailStore.svelte';
  import { DOMSerializer, type Node as ProseMirrorNode } from 'prosemirror-model';
  import { extractContentWithPositions } from '$lib/utils/contentExtraction';

  // =================================================================
  // COMPONENT PROPERTIES & STATE
  // =================================================================
  let {
    treeData,
    selectedNodeId,
    colorMode = 'none'
  }: {
    treeData: TreeNodeData | null;
    selectedNodeId: string | null;
    colorMode?: 'none' | 'by-level' | 'by-path';
  } = $props();

  const dispatch = createEventDispatcher<{ nodeClick: { id: string } }>();

  let svgEl = $state<SVGSVGElement | undefined>();
  let gEl = $state<SVGGElement | undefined>();
  let rootNode = $state<ReturnType<typeof hierarchy<TreeNodeData>> | null>(null);
  let expandedNodeIds = $state<Set<string>>(new Set(['root-title']));
  let zoomBehavior = $state<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );
  let previousTreeNodeId = $state<string | null>(null);

  /** Timer to differentiate between single and double clicks. */
  let clickTimer: ReturnType<typeof setTimeout> | null = null;

  // =================================================================
  // D3 CONSTANTS & TYPES
  // =================================================================
  const nodeWidth = 140;
  const nodeHeight = 40;
  const transitionDuration = 350;
  const doubleClickDelay = 250; // The window in ms to wait for a double click.
  type TreeLayoutResult = ReturnType<ReturnType<typeof tree<TreeNodeData>>>;
  type PointNode = TreeLayoutResult & {
    x0?: number;
    y0?: number;
    _children?: ReturnType<typeof hierarchy<TreeNodeData>>[];
  };

  // =================================================================
  // COLOR HELPERS
  // =================================================================
  const gradientColors = [
    'linear-gradient(135deg, hsl(220, 90%, 58%) 0%, hsl(240, 85%, 65%) 100%)', // Blue-Purple
    'linear-gradient(135deg, hsl(160, 75%, 45%) 0%, hsl(180, 70%, 50%) 100%)', // Teal-Cyan
    'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(300, 75%, 65%) 100%)', // Purple-Magenta
    'linear-gradient(135deg, hsl(30, 90%, 55%) 0%, hsl(45, 85%, 60%) 100%)',   // Orange-Gold
    'linear-gradient(135deg, hsl(340, 80%, 60%) 0%, hsl(350, 75%, 65%) 100%)', // Pink-Rose
    'linear-gradient(135deg, hsl(120, 65%, 50%) 0%, hsl(140, 70%, 55%) 100%)', // Green-Emerald
    'linear-gradient(135deg, hsl(200, 85%, 55%) 0%, hsl(220, 80%, 60%) 100%)', // Sky-Blue
    'linear-gradient(135deg, hsl(270, 70%, 58%) 0%, hsl(280, 75%, 62%) 100%)', // Violet-Purple
    'linear-gradient(135deg, hsl(10, 80%, 60%) 0%, hsl(20, 75%, 65%) 100%)',   // Red-Coral
    'linear-gradient(135deg, hsl(170, 70%, 50%) 0%, hsl(160, 75%, 55%) 100%)', // Mint-Teal
    'linear-gradient(135deg, hsl(50, 85%, 55%) 0%, hsl(65, 80%, 60%) 100%)',   // Yellow-Lime
    'linear-gradient(135deg, hsl(310, 75%, 60%) 0%, hsl(320, 70%, 65%) 100%)', // Magenta-Pink
    'linear-gradient(135deg, hsl(190, 80%, 52%) 0%, hsl(200, 75%, 57%) 100%)', // Aqua-Sky
    'linear-gradient(135deg, hsl(90, 70%, 50%) 0%, hsl(110, 75%, 55%) 100%)',  // Lime-Green
    'linear-gradient(135deg, hsl(260, 75%, 58%) 0%, hsl(270, 80%, 63%) 100%)', // Indigo-Violet
    'linear-gradient(135deg, hsl(350, 80%, 58%) 0%, hsl(360, 75%, 62%) 100%)', // Rose-Red
  ];

  function getColorForNode(node: PointNode): string | null {
    if (colorMode === 'none') return null;
    
    if (colorMode === 'by-level') {
      const level = node.depth; // depth 0 = root, depth 1 = level 2, etc.
      if (level === 0) return null; // Root has no color
      return gradientColors[(level - 1) % gradientColors.length];
    }
    
    if (colorMode === 'by-path') {
      // Get the first child of root (top-level section) for this node
      const ancestors = node.ancestors();
      const topLevelAncestor = ancestors[ancestors.length - 2]; // -1 is root, -2 is first child
      if (!topLevelAncestor || topLevelAncestor === node.parent) return null;
      
      // Hash the top-level ancestor ID to get consistent color
      const id = topLevelAncestor.data.id;
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash = hash & hash;
      }
      return gradientColors[Math.abs(hash) % gradientColors.length];
    }
    
    return null;
  }

  // =================================================================
  // CORE D3 EFFECTS
  // =================================================================

  /** Effect for one-time SVG setup, zoom behavior, and initial centering. */
  $effect(() => {
    if (!svgEl) return;
    const svg = select(svgEl);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('class', 'content-group');
    gEl = g.node()!;

    const newZoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on('zoom', (event: any) => g.attr('transform', event.transform.toString()));
    zoomBehavior = newZoomBehavior;

    svg.call(newZoomBehavior).on('dblclick.zoom', null);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries?.[0] || !gEl) return;
      const { height } = entries[0].contentRect;
      const initialTransform = zoomIdentity.translate(80, height / 2);
      svg.call(newZoomBehavior.transform, initialTransform);
    });
    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });

  /** Effect to process incoming treeData into a D3 hierarchy. */
  $effect(() => {
    if (!treeData) {
      rootNode = null;
      return;
    }
    const root = hierarchy(treeData);
    (root as PointNode).x0 = 0;
    (root as PointNode).y0 = 0;
    root.each((d) => {
      const node = d as PointNode;
      if (node.children && !expandedNodeIds.has(node.data.id)) {
        node._children = node.children;
        node.children = undefined;
      }
    });
    rootNode = root;
  });

  /** Effect to trigger the main D3 drawing function when the data or expanded state changes. */
  $effect(() => {
    if (!rootNode || !gEl) {
      if (gEl) select(gEl).selectAll('*').remove();
      return;
    }
    tick().then(() => {
      update(rootNode as PointNode);
      // Flatten tree for navigation
      flattenTreeForNavigation();
    });
  });

  /** Effect to apply the 'is-selected' class from component props. */
  $effect(() => {
    if (!gEl) return;
    select(gEl)
      .selectAll<SVGGElement, PointNode>('g.node')
      .classed('is-selected', (d) => d.data.id === selectedNodeId);
  });

  /** Effect to apply the 'is-reading' class from the node detail store. */
  $effect(() => {
    if (!gEl) return;
    const { activeNodeId } = nodeDetailState;
    select(gEl)
      .selectAll<SVGGElement, PointNode>('g.node')
      .classed('is-reading', (d) => d.data.id === activeNodeId);
  });

  /** Effect to re-render when colorMode changes. */
  $effect(() => {
    if (!rootNode || !gEl) return;
    // Watch colorMode changes
    colorMode;
    // Force update to reapply colors
    tick().then(() => update(rootNode as PointNode));
  });

  // =================================================================
  // CINEMATIC & TTS ANIMATION EFFECT
  // =================================================================

  $effect(() => {
    const { activeTreeNodeId, status } = ttsState;
    if (status === 'idle' || !activeTreeNodeId) {
      highlightNodePath(null);
      previousTreeNodeId = null;
      return;
    }
    if (activeTreeNodeId === previousTreeNodeId) return;

    const currentNode = findNodeById(activeTreeNodeId);
    if (!currentNode) return;

    const previousNode = previousTreeNodeId
      ? findNodeById(previousTreeNodeId)
      : null;
    if (previousNode) {
      const isDescendant = previousNode
        .descendants()
        .some((d) => d.data.id === currentNode.data.id);
      if (!isDescendant) {
        expandedNodeIds.delete(previousNode.data.id);
      }
    }

    expandPathToNode(currentNode);
    tick().then(() => {
      panToNode(currentNode);
      setTimeout(() => highlightNodePath(currentNode), 100);
    });
    previousTreeNodeId = activeTreeNodeId;
  });

  // =================================================================
  // HELPER FUNCTIONS
  // =================================================================

  /** Finds a D3 node in the full hierarchy (including collapsed nodes) by its data ID. */
  function findNodeById(id: string): PointNode | undefined {
    if (!rootNode) return undefined;
    let foundNode: PointNode | undefined;
    rootNode.each((d) => {
      if (d.data.id === id) foundNode = d as PointNode;
    });
    return foundNode;
  }

  function panToNode(targetNode: PointNode) {
    if (!svgEl || !zoomBehavior) return;
    const svg = select(svgEl);
    const { width, height } = svg.node()!.getBoundingClientRect();
    // Get current scale from the transform
    const svgNode = svg.node()!;
    const currentTransform = (svgNode as any).__zoom || zoomIdentity;
    const { k: currentScale } = currentTransform;

    const newTransform = zoomIdentity
      .translate(
        width / 2 - targetNode.y * currentScale,
        height / 2 - targetNode.x * currentScale
      )
      .scale(currentScale);

    svg
      .transition()
      .duration(transitionDuration + 200)
      .call(zoomBehavior.transform, newTransform);
  }

  /** Expands the tree path to make the target node visible. */
  function expandPathToNode(targetNode: PointNode) {
    let changed = false;
    targetNode.ancestors().forEach((ancestor) => {
      if (!expandedNodeIds.has(ancestor.data.id)) {
        expandedNodeIds.add(ancestor.data.id);
        changed = true;
      }
    });
    if (changed) expandedNodeIds = new Set(expandedNodeIds);
  }

  /**
   * Flattens the tree into an array for navigation.
   * Extracts all visible nodes with their ID, title, and content.
   */
  function flattenTreeForNavigation(): void {
    if (!rootNode) {
      setFlattenedTree([]);
      return;
    }
    
    const flattenedNodes: Array<{ id: string; title: string; content: string }> = [];
    const editor = editorState.instance;
    
    if (!editor) {
      setFlattenedTree([]);
      return;
    }
    
    // Traverse all nodes in the tree (depth-first)
    rootNode.each((d) => {
      const node = d as PointNode;
      const nodeId = node.data.id;
      
      // Find the heading node in the ProseMirror document
      let headingNode: ProseMirrorNode | null = null;
      let headingPos = -1;
      
      editor.state.doc.descendants((pmNode, pos) => {
        if (pmNode.attrs.nodeId === nodeId && pmNode.type.name.startsWith('heading')) {
          headingNode = pmNode;
          headingPos = pos;
          return false;
        }
      });
      
      if (!headingNode) return;
      
      // Type assertion after null check
      const typedHeadingNode = headingNode as ProseMirrorNode;
      const title = typedHeadingNode.textContent;
      
      // Extract content (same logic as double-click)
      let endPos = editor.state.doc.content.size;
      const currentLevel = typedHeadingNode.attrs.level;
      let foundNextHeading = false;

      editor.state.doc.nodesBetween(
        headingPos + typedHeadingNode.nodeSize,
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
        headingPos + typedHeadingNode.nodeSize,
        endPos,
        editor.state.schema
      );
      
      flattenedNodes.push({ id: nodeId, title, content });
    });
    
    setFlattenedTree(flattenedNodes);
  }

  /** Applies hover highlight classes to a node and its path. */
  function highlightNodePath(targetNode: PointNode | null) {
    if (!gEl) return;
    const g = select(gEl);
    g.selectAll('g.node').classed('is-dimmed is-ancestor is-descendant', false);
    g.selectAll('path.link').classed(
      'is-dimmed is-ancestor is-descendant',
      false
    );

    if (!targetNode) return;

    g.selectAll('g.node, path.link').classed('is-dimmed', true);

    const ancestors = targetNode.ancestors();
    const descendants = targetNode.descendants();
    const ancestorIds = new Set(ancestors.map((n) => n.data.id));
    const descendantIds = new Set(descendants.map((n) => n.data.id));

    g.selectAll<SVGGElement, PointNode>('g.node')
      .filter((n) => ancestorIds.has(n.data.id))
      .classed('is-dimmed', false)
      .classed('is-ancestor', true);

    g.selectAll<SVGGElement, PointNode>('g.node')
      .filter((n) => descendantIds.has(n.data.id))
      .classed('is-dimmed', false)
      .classed('is-descendant', true);

    g.selectAll<SVGGElement, PointNode>('g.node')
      .filter((n) => n.data.id === targetNode.data.id)
      .classed('is-ancestor', false);

    g.selectAll('path.link')
      .filter(
        (l: any) =>
          ancestorIds.has(l.source.data.id) && ancestorIds.has(l.target.data.id)
      )
      .classed('is-dimmed', false)
      .classed('is-ancestor', true);

    g.selectAll('path.link')
      .filter(
        (l: any) =>
          descendantIds.has(l.source.data.id) &&
          descendantIds.has(l.target.data.id)
      )
      .classed('is-dimmed', false)
      .classed('is-descendant', true);
  }

  // =================================================================
  // MAIN D3 UPDATE FUNCTION
  // =================================================================

  /**
   * The main D3 drawing function. It handles the enter, update, and exit
   * selections for both nodes and links to render the tree.
   * @param source The node that was clicked, used as the origin for animations.
   */
  function update(source: PointNode) {
    if (!gEl || !rootNode) return;
    const g = select(gEl);
    const dx = nodeHeight + 20;
    const dy = nodeWidth + 60;
    const treeLayout = tree<TreeNodeData>().nodeSize([dx, dy]);
    const layoutRoot = treeLayout(rootNode) as TreeLayoutResult;
    const nodes = layoutRoot.descendants().reverse() as PointNode[];
    const links = layoutRoot.links() as any[];
    const transition = select(gEl).transition().duration(transitionDuration) as any;

    // --- NODES ---
    const node = g
      .selectAll<SVGGElement, PointNode>('g.node')
      .data(nodes, (d) => d.data.id);

    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', `translate(${source.y0 ?? 0},${source.x0 ?? 0})`)
      .attr('opacity', 0)
      .on('click', (_, d) => {
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        clickTimer = setTimeout(() => {
          if (d.children || d._children) {
            expandedNodeIds.has(d.data.id)
              ? expandedNodeIds.delete(d.data.id)
              : expandedNodeIds.add(d.data.id);
            expandedNodeIds = new Set(expandedNodeIds);
          }
        }, doubleClickDelay);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }

        const editor = editorState.instance;
        if (!editor) return;

        let headingNode: ProseMirrorNode | null = null,
          headingPos = -1;
        editor.state.doc.descendants((node, pos) => {
          if (node.attrs.nodeId === d.data.id) {
            headingNode = node;
            headingPos = pos;
            return false;
          }
        });

        if (headingNode && headingPos !== -1) {
          const typedHeadingNode = headingNode as ProseMirrorNode;
          
          // Find end of section
          let endPos = editor.state.doc.content.size;
          const currentLevel = typedHeadingNode.attrs.level;
          let foundNextHeading = false;

          editor.state.doc.nodesBetween(
            headingPos + typedHeadingNode.nodeSize,
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
            headingPos + typedHeadingNode.nodeSize,
            endPos,
            editor.state.schema
          );

          openPanel(d.data.id, typedHeadingNode.textContent, content);
        }
      })
      .on('mouseover', (_, d) => {
        if (ttsState.status === 'idle') highlightNodePath(d);
      })
      .on('mouseout', () => {
        if (ttsState.status === 'idle') highlightNodePath(null);
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
      .attr('class', 'node-label');

    nodeEnter.append('circle').attr('class', 'indicator').attr('r', 4);

    const nodeUpdate = node.merge(nodeEnter);
    nodeUpdate.select('div.node-label').html((d) => d.data.content);
    
    // Apply color mode with gradients
    nodeUpdate.select('rect').each(function(d) {
      const color = getColorForNode(d);
      const rectEl = select(this);
      
      if (color && color.startsWith('linear-gradient')) {
        if (!svgEl) return; // Guard against undefined
        
        // Create unique gradient ID
        const gradientId = `gradient-${d.data.id}`;
        
        // Parse gradient string
        const match = color.match(/linear-gradient\((\d+)deg,\s*(.+?)\s+(\d+%),\s*(.+?)\s+(\d+%)\)/);
        if (match) {
          const [, angle, color1, , color2] = match;
          
          // Find or create defs
          const svg = select(svgEl);
          let defs = svg.select<SVGDefsElement>('defs');
          if (defs.empty()) {
            defs = svg.insert<SVGDefsElement>('defs', ':first-child');
          }
          
          // Remove old gradient if exists
          defs.select(`#${gradientId}`).remove();
          
          // Create new gradient
          const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '100%');
          
          gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', color1);
          
          gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', color2);
          
          rectEl.attr('fill', `url(#${gradientId})`);
        }
      } else if (color) {
        rectEl.style('fill', color);
      } else {
        rectEl.style('fill', null);
      }
    });
    
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

    // --- LINKS ---
    const link = g
      .selectAll<SVGPathElement, any>('path.link')
      .data(links, (d) => d.target.data.id);

    function customLinkGenerator(d: any) {
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
    stroke: var(--color-gray-600); /* Keep high contrast */
    stroke-width: 1px; /* Thin lines */
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
    stroke: var(--color-gray-600); /* Keep high contrast */
    stroke-width: 1px; /* Thin borders */
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
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.3;
    word-break: break-word;
    user-select: none;
    pointer-events: none;
  }
  :global(.tree-svg .node .indicator) {
    stroke: var(--color-gray-600);
    stroke-width: 1px;
    fill: transparent;
    transition:
      fill 300ms,
      stroke 300ms,
      opacity 300ms;
  }
  :global(.tree-svg .node .indicator.is-collapsed) {
    fill: var(--color-gray-600);
  }
  :global(.tree-svg .node:hover .indicator.is-collapsed) {
    fill: var(--color-accent);
    stroke: var(--color-accent);
  }
  :global(.tree-svg .node:hover .indicator) {
    stroke: var(--color-accent);
  }
  :global(.tree-svg .node:hover rect) {
    stroke: var(--color-accent);
    stroke-width: 2px; /* Slight bump on hover */
  }
  :global(.tree-svg .node.is-selected rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
    fill: hsl(var(--color-accent-hsl, 16 84% 53%) / 0.1);
  }
  :global(.tree-svg .node.is-selected .node-label) {
    font-weight: 700;
  }
  :global(.tree-svg .node.is-reading rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
    fill: hsl(var(--color-accent-hsl, 16 84% 53%) / 0.15);
  }
  :global(.tree-svg .is-dimmed) {
    opacity: 0.1 !important;
  }
  :global(.tree-svg .link.is-ancestor) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }
  :global(.tree-svg .node.is-ancestor rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }
  :global(.tree-svg .link.is-descendant) {
    stroke: var(--color-gray-600);
    stroke-width: 1px;
  }
  :global(.tree-svg .node.is-descendant rect) {
    stroke: var(--color-gray-600);
    stroke-width: 1px;
  }
</style>
