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
  import { uiState } from '$lib/stores/uiStore.svelte';
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
  }: {
    treeData: TreeNodeData | null;
    selectedNodeId: string | null;
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
  // =================================================================
  // D3 CONSTANTS & TYPES
  // =================================================================
  let nodeWidth = $state(140); // Dynamic width based on content
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
  // COLOR & VISUAL CONSTANTS
  // =================================================================
  
  const gradients = [
    // Serene Sky / Twilight Theme Coherent Gradients (Boosted Vibrancy)
    { id: 'grad-std-primary', stops: ['#3b82f6', '#1d4ed8'] },   // Brighter Blue -> Deep Blue
    { id: 'grad-std-warm', stops: ['#f97316', '#db2777'] },      // Bright Orange -> Pink
    { id: 'grad-std-success', stops: ['#10b981', '#0ea5e9'] },   // Emerald -> Sky Blue
    { id: 'grad-std-accent', stops: ['#8b5cf6', '#d946ef'] },    // Violet -> Fuchsia
    { id: 'grad-std-cool', stops: ['#06b6d4', '#3b82f6'] },      // Cyan -> Blue
    { id: 'grad-std-deep', stops: ['#6366f1', '#a855f7'] },      // Indigo -> Purple
  ];

  function getColorUrlForNode(node: PointNode): string | null {
    if (uiState.colorMode === 'none') return null;
    
    let index = 0;
    if (uiState.colorMode === 'by-level') {
      const level = node.depth;
      if (level === 0) return null;
      index = (level - 1) % gradients.length;
    } else if (uiState.colorMode === 'by-path') {
      const ancestors = node.ancestors();
      // Use the ancestor at depth 1 (direct child of root) as the branch identifier
      const topLevelAncestor = ancestors[ancestors.length - 2];
      
      // If no top level ancestor (e.g. root), return null
      if (!topLevelAncestor) return null;
      
      const id = topLevelAncestor.data.id;
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash = hash & hash;
      }
      index = Math.abs(hash) % gradients.length;
    }
    
    return `url(#${gradients[index].id})`;
  }

  // =================================================================
  // CORE D3 EFFECTS
  // =================================================================

  function ensureDefs() {
    if (!svgEl) return;
    const svg = select(svgEl);
    
    if (!svg.select('defs').empty()) return;

    const defs = svg.append('defs');

    // Drop Shadow Filter
    const filter = defs.append('filter')
      .attr('id', 'drop-shadow-std')
      .attr('height', '130%');
    
    filter.append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3)
      .attr('result', 'blur');
    
    filter.append('feOffset')
      .attr('in', 'blur')
      .attr('dx', 2)
      .attr('dy', 2)
      .attr('result', 'offsetBlur');
      
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'offsetBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradients - Create all gradients
    gradients.forEach(g => {
      const gradient = defs.append('linearGradient')
        .attr('id', g.id)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');
      
      gradient.append('stop').attr('offset', '0%').attr('stop-color', g.stops[0]);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', g.stops[1]);
    });
  }

  /** Effect for one-time SVG setup, zoom behavior, and initial centering. */
  $effect(() => {
    if (!svgEl) return;
    const svg = select(svgEl);
    
    // Only append content group if it doesn't exist
    if (svg.select('.content-group').empty()) {
      ensureDefs();
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
    }
  });

  let nodePositions = new Map<string, { x: number; y: number }>();

  function getTextWidth(text: string, font: string): number {
    // Helper to measure text width
    if (typeof document === 'undefined') return 0;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 0;
    context.font = font;
    return context.measureText(text).width;
  }

  /** Effect to process incoming treeData into a D3 hierarchy. */
  $effect(() => {
    if (!treeData) {
      rootNode = null;
      return;
    }

    // Dynamic Width Calculation
    let maxTextWidth = 0;
    const traverse = (node: TreeNodeData) => {
      if (node.content) {
        // Using approximate font settings from CSS: 600 0.75rem (12px)
        const w = getTextWidth(node.content, '600 12px sans-serif');
        if (w > maxTextWidth) maxTextWidth = w;
      }
      if (node.children) node.children.forEach(traverse);
    };
    traverse(treeData);

    // Calculate new width:
    // 1. Divide max width by ~1.8 to aim for 2 lines (not exactly 2 to avoid edge cases)
    // 2. Add padding (26px)
    // 3. Clamp between 140px (min) and 600px (max)
    const targetWidth = (maxTextWidth / 1.8) + 26;
    const calculatedWidth = Math.max(140, Math.min(600, targetWidth));
    nodeWidth = calculatedWidth;

    const root = hierarchy(treeData);
    
    // Restore positions to ensure smooth transitions
    root.each((d) => {
      const node = d as PointNode;
      const saved = nodePositions.get(node.data.id);
      
      if (saved) {
        node.x0 = saved.x;
        node.y0 = saved.y;
      } else if (node.parent && (node.parent as PointNode).x0 !== undefined) {
        // Inherit from parent if new
        node.x0 = (node.parent as PointNode).x0;
        node.y0 = (node.parent as PointNode).y0;
      } else {
        // Default to root
        node.x0 = 0;
        node.y0 = 0;
      }

      if (node.children && !expandedNodeIds.has(node.data.id)) {
        node._children = node.children;
        node.children = undefined;
      }
    });
    rootNode = root;
  });

  let lastToggledNodeId = $state<string | null>(null);

  /** Effect to trigger the main D3 drawing function when the data or expanded state changes. */
  $effect(() => {
    if (!rootNode || !gEl) {
      if (gEl) select(gEl).selectAll('*').remove();
      return;
    }
    tick().then(() => {
      let source = rootNode as PointNode;
      if (lastToggledNodeId) {
        const found = findNodeById(lastToggledNodeId);
        if (found) source = found;
      }
      update(source);
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
    uiState.colorMode;
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
    ensureDefs();
    if (!gEl || !rootNode) return;
    const g = select(gEl);
    const dx = nodeHeight + 20;
    const dy = nodeWidth + 60;
    const treeLayout = tree<TreeNodeData>().nodeSize([dx, dy]);
    const layoutRoot = treeLayout(rootNode) as TreeLayoutResult;
    
    // Create a map for fast lookup of nodes in the new layout
    const newLayoutMap = new Map<string, PointNode>();
    layoutRoot.descendants().forEach(d => newLayoutMap.set(d.data.id, d as PointNode));
    
    // Find the source node in the new layout to get its correct coordinates
    let layoutSource: PointNode | undefined;
    
    // 1. Try using the explicitly toggled node ID
    if (lastToggledNodeId) {
      layoutSource = newLayoutMap.get(lastToggledNodeId);
      
      // Fallback: If not in new layout, use last known position
      if (!layoutSource) {
         const lastPos = nodePositions.get(lastToggledNodeId);
         if (lastPos) {
            layoutSource = { x: lastPos.x, y: lastPos.y } as PointNode;
         }
      }
    }
    
    // 2. Fallback to the source node's ID
    if (!layoutSource) {
      layoutSource = newLayoutMap.get(source.data.id);
      
      // Fallback: If not in new layout, use last known position
      if (!layoutSource) {
         const lastPos = nodePositions.get(source.data.id);
         if (lastPos) {
            layoutSource = { x: lastPos.x, y: lastPos.y } as PointNode;
         }
      }
    }
    
    // 3. Ultimate fallback to root
    if (!layoutSource) {
      layoutSource = layoutRoot as PointNode;
    }
    
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
      // Enter at the source's PREVIOUS position
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
            lastToggledNodeId = d.data.id;
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
    
    // Update widths for dynamic sizing
    nodeUpdate.select('rect').attr('width', nodeWidth);
    nodeUpdate.select('foreignObject').attr('width', nodeWidth);

    nodeUpdate.select('div.node-label').html((d) => d.data.content);
    
    // Apply color mode with gradients
    nodeUpdate.select('rect').each(function(d) {
      const colorUrl = getColorUrlForNode(d);
      const rectEl = select(this);
      const rectNode = this as SVGRectElement;
      if (!rectNode.parentNode) return;
      
      const nodeGroup = select(rectNode.parentNode as SVGGElement);
      
      if (colorUrl) {
        rectNode.style.setProperty('--node-fill', colorUrl);
        rectEl.style('filter', 'url(#drop-shadow-std)');
        rectEl.style('stroke', 'none');
        nodeGroup.classed('has-color', true);
      } else {
        // "No Color" Mode - High Contrast Visibility
        rectNode.style.setProperty('--node-fill', 'var(--color-background-raised)');
        rectEl.style('stroke', 'var(--color-gray-400)');
        rectEl.style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
        nodeGroup.classed('has-color', false);
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
      .attr('transform', () => `translate(${layoutSource.y ?? 0},${layoutSource.x ?? 0})`)
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
        const o = { x: layoutSource.x ?? 0, y: layoutSource.y ?? 0 };
        return customLinkGenerator({ source: o, target: o } as any);
      });

    layoutRoot.each((d) => {
      const node = d as PointNode;
      node.x0 = node.x;
      node.y0 = node.y;
      // Save positions for next render
      nodePositions.set(node.data.id, { x: node.x, y: node.y });
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
    fill: var(--node-fill, var(--color-background-raised));
    stroke: var(--color-gray-400); /* Darker default border */
    stroke-width: 2px; /* Thicker border */
    transition:
      fill 0.2s,
      stroke 0.2s,
      stroke-width 0.2s,
      filter 0.2s;
  }
  :global(.tree-svg .node.has-color rect) {
    stroke: none;
    fill: var(--node-fill) !important;
  }
  :global(.dark .tree-svg .node:not(.has-color) rect) {
    fill: var(--color-gray-200);
    stroke: var(--color-gray-500);
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
    line-height: 1.2;
    word-break: break-word;
    user-select: none;
    pointer-events: none;
    text-shadow: none;
    color: var(--color-text);
    
    /* Allow up to 2 lines */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal; /* Ensure text wraps */
  }
  :global(.tree-svg .node.has-color .node-label) {
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    font-weight: 500;
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
    stroke-width: 3px;
  }
  :global(.tree-svg .node.is-selected.has-color rect) {
    stroke: white;
    stroke-width: 3px;
    paint-order: stroke;
  }
  :global(.tree-svg .node.is-selected .node-label) {
    font-weight: 700;
  }
  :global(.tree-svg .node.is-reading rect) {
    stroke: var(--color-accent);
    stroke-width: 3px;
    stroke-dasharray: 4 2;
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
