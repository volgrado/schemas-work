<!--
  src/lib/components/visualization/RadialTree.svelte
  A radial tree visualization matching StandardTree's functionality.
-->
<script module lang="ts">
  import type { TreeNodeData } from './StandardTree.svelte';
</script>

<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { select } from 'd3-selection';
  import { hierarchy, tree } from 'd3-hierarchy';
  import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
  import 'd3-transition';
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
  // COMPONENT PROPERTIES
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
  let zoomBehavior = $state<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  let previousTreeNodeId = $state<string | null>(null);
  let clickTimer: ReturnType<typeof setTimeout> | null = null;

  // =================================================================
  // D3 CONSTANTS
  // =================================================================
  const nodeWidth = 140;
  const nodeHeight = 40;
  const transitionDuration = 350;
  const doubleClickDelay = 250;
  const radius = 600;

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
      const level = node.depth;
      if (level === 0) return null;
      return gradientColors[(level - 1) % gradientColors.length];
    }
    
    if (colorMode === 'by-path') {
      const ancestors = node.ancestors();
      const topLevelAncestor = ancestors[ancestors.length - 2];
      if (!topLevelAncestor || topLevelAncestor === node.parent) return null;
      
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
  // EFFECTS
  // =================================================================

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
      const { width, height } = entries[0].contentRect;
      const initialTransform = zoomIdentity.translate(width / 2, height / 2).scale(0.7);
      svg.call(newZoomBehavior.transform, initialTransform);
    });
    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });

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

  $effect(() => {
    if (!rootNode || !gEl) {
      if (gEl) select(gEl).selectAll('*').remove();
      return;
    }
    tick().then(() => {
      update(rootNode as PointNode);
      flattenTreeForNavigation();
    });
  });

  $effect(() => {
    if (!gEl) return;
    select(gEl)
      .selectAll<SVGGElement, PointNode>('g.node')
      .classed('is-selected', (d) => d.data.id === selectedNodeId);
  });

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

    const previousNode = previousTreeNodeId ? findNodeById(previousTreeNodeId) : null;
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
    const svgNode = svg.node()!;
    const currentTransform = (svgNode as any).__zoom || zoomIdentity;
    const { k: currentScale } = currentTransform;

    // Convert radial coordinates to cartesian
    const angle = targetNode.x;
    const r = targetNode.y;
    const tx = r * Math.cos(angle - Math.PI / 2);
    const ty = r * Math.sin(angle - Math.PI / 2);

    const newTransform = zoomIdentity
      .translate(width / 2 - tx * currentScale, height / 2 - ty * currentScale)
      .scale(currentScale);

    svg.transition().duration(transitionDuration + 200).call(zoomBehavior.transform, newTransform);
  }

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

    rootNode.each((d) => {
      const node = d as PointNode;
      const nodeId = node.data.id;

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

      const typedHeadingNode = headingNode as ProseMirrorNode;
      const title = typedHeadingNode.textContent;

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

  function highlightNodePath(targetNode: PointNode | null) {
    if (!gEl) return;
    const g = select(gEl);
    g.selectAll('g.node').classed('is-dimmed is-ancestor is-descendant', false);
    g.selectAll('path.link').classed('is-dimmed is-ancestor is-descendant', false);

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
      .filter((l: any) => ancestorIds.has(l.source.data.id) && ancestorIds.has(l.target.data.id))
      .classed('is-dimmed', false)
      .classed('is-ancestor', true);

    g.selectAll('path.link')
      .filter((l: any) => descendantIds.has(l.source.data.id) && descendantIds.has(l.target.data.id))
      .classed('is-dimmed', false)
      .classed('is-descendant', true);
  }

  // =================================================================
  // MAIN UPDATE FUNCTION
  // =================================================================

  function update(source: PointNode) {
    if (!gEl || !rootNode) return;
    const g = select(gEl);
    
    const treeLayout = tree<TreeNodeData>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    const layoutRoot = treeLayout(rootNode) as TreeLayoutResult;
    const nodes = layoutRoot.descendants().reverse() as PointNode[];
    const links = layoutRoot.links() as any[];
    const transition = select(gEl).transition().duration(transitionDuration) as any;

    // --- NODES ---
    const node = g.selectAll<SVGGElement, PointNode>('g.node').data(nodes, (d) => d.data.id);

    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', () => {
        const angle = source.x0 ?? 0;
        const r = source.y0 ?? 0;
        const x = r * Math.cos(angle - Math.PI / 2);
        const y = r * Math.sin(angle - Math.PI / 2);
        return `translate(${x},${y})`;
      })
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
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('rx', 4);

    nodeEnter
      .append('foreignObject')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('x', -nodeWidth / 2)
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
        
        const gradientId = `gradient-${d.data.id}`;
        const match = color.match(/linear-gradient\((\d+)deg,\s*(.+?)\s+(\d+%),\s*(.+?)\s+(\d+%)\)/);
        if (match) {
          const [, angle, color1, , color2] = match;
          
          const svg = select(svgEl);
          let defs = svg.select<SVGDefsElement>('defs');
          if (defs.empty()) {
            defs = svg.insert<SVGDefsElement>('defs', ':first-child');
          }
          
          defs.select(`#${gradientId}`).remove();
          
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
      .attr('transform', `translate(${nodeWidth / 2 - 10}, ${-nodeHeight / 2 + 10})`);

    nodeUpdate
      .transition(transition)
      .attr('transform', (d) => {
        const angle = d.x;
        const r = d.y;
        const x = r * Math.cos(angle - Math.PI / 2);
        const y = r * Math.sin(angle - Math.PI / 2);
        return `translate(${x},${y})`;
      })
      .attr('opacity', 1);

    node
      .exit()
      .transition(transition)
      .remove()
      .attr('transform', () => {
        const angle = source.x ?? 0;
        const r = source.y ?? 0;
        const x = r * Math.cos(angle - Math.PI / 2);
        const y = r * Math.sin(angle - Math.PI / 2);
        return `translate(${x},${y})`;
      })
      .attr('opacity', 0);

    // --- LINKS ---
    const link = g.selectAll<SVGPathElement, any>('path.link').data(links, (d) => d.target.data.id);

    function radialLinkGenerator(d: any) {
      const startAngle = d.source.x ?? 0;
      const startRadius = d.source.y ?? 0;
      const endAngle = d.target.x ?? 0;
      const endRadius = d.target.y ?? 0;

      const sx = startRadius * Math.cos(startAngle - Math.PI / 2);
      const sy = startRadius * Math.sin(startAngle - Math.PI / 2);
      const ex = endRadius * Math.cos(endAngle - Math.PI / 2);
      const ey = endRadius * Math.sin(endAngle - Math.PI / 2);

      // Create curved path using quadratic bezier
      // Control point is at the midpoint radius along the target angle
      const midRadius = (startRadius + endRadius) / 2;
      const cx = midRadius * Math.cos(endAngle - Math.PI / 2);
      const cy = midRadius * Math.sin(endAngle - Math.PI / 2);

      return `M ${sx},${sy} Q ${cx},${cy} ${ex},${ey}`;
    }

    const linkEnter = link
      .enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const angle = source.x0 ?? 0;
        const r = source.y0 ?? 0;
        const x = r * Math.cos(angle - Math.PI / 2);
        const y = r * Math.sin(angle - Math.PI / 2);
        return `M ${x},${y} L ${x},${y}`;
      });

    link.merge(linkEnter).transition(transition).attr('d', radialLinkGenerator);

    link
      .exit()
      .transition(transition)
      .remove()
      .attr('d', () => {
        const angle = source.x ?? 0;
        const r = source.y ?? 0;
        const x = r * Math.cos(angle - Math.PI / 2);
        const y = r * Math.sin(angle - Math.PI / 2);
        return `M ${x},${y} L ${x},${y}`;
      });

    layoutRoot.each((d) => {
      const node = d as PointNode;
      node.x0 = node.x;
      node.y0 = node.y;
    });
  }
</script>

<div class="radial-container" role="tree" aria-label="Radial schema visualization">
  <svg bind:this={svgEl} class="radial-svg"></svg>
</div>

<style>
  .radial-container,
  .radial-svg {
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
    background-color: var(--color-background);
  }
  .radial-container:active {
    cursor: grabbing;
  }

  :global(.radial-svg .link) {
    fill: none;
    stroke: var(--color-gray-600);
    stroke-width: 1px;
    transition: stroke 300ms, stroke-width 300ms, opacity 300ms;
  }

  :global(.radial-svg .node) {
    cursor: pointer;
    font-family: var(--font-main);
    transition: opacity 300ms;
    -webkit-tap-highlight-color: transparent;
  }

  :global(.radial-svg .node rect) {
    fill: var(--color-background);
    stroke: var(--color-gray-600);
    stroke-width: 1px;
    transition: fill 0.2s, stroke 0.2s, stroke-width 0.2s;
  }

  :global(.radial-svg .node .node-label) {
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

  :global(.radial-svg .node .indicator) {
    stroke: var(--color-gray-600);
    stroke-width: 1px;
    fill: transparent;
    transition: fill 300ms, stroke 300ms, opacity 300ms;
  }

  :global(.radial-svg .node .indicator.is-collapsed) {
    fill: var(--color-gray-600);
  }

  :global(.radial-svg .node:hover .indicator.is-collapsed) {
    fill: var(--color-accent);
    stroke: var(--color-accent);
  }

  :global(.radial-svg .node:hover .indicator) {
    stroke: var(--color-accent);
  }

  :global(.radial-svg .node:hover rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }

  :global(.radial-svg .node.is-selected rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
    fill: hsl(var(--color-accent-hsl, 16 84% 53%) / 0.1);
  }

  :global(.radial-svg .node.is-selected .node-label) {
    font-weight: 700;
  }

  :global(.radial-svg .node.is-reading rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
    fill: hsl(var(--color-accent-hsl, 16 84% 53%) / 0.15);
  }

  :global(.radial-svg .is-dimmed) {
    opacity: 0.1 !important;
  }

  :global(.radial-svg .link.is-ancestor) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }

  :global(.radial-svg .node.is-ancestor rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }

  :global(.radial-svg .link.is-descendant) {
    stroke: var(--color-gray-600);
    stroke-width: 1px;
  }

  :global(.radial-svg .node.is-descendant rect) {
    stroke: var(--color-gray-600);
    stroke-width: 1px;
  }
</style>
