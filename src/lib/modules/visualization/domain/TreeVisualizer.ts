import type { Selection } from 'd3-selection';
import type { HierarchyNode, TreeLayout } from 'd3-hierarchy';
import type { ZoomBehavior } from 'd3-zoom';
import type { Link } from 'd3-shape';

// D3 Module Types (Lazy Loaded)
type D3 = typeof import('d3');

type D3Selection<T extends d3.BaseType> = Selection<T, unknown, null, undefined>;

export interface TreeNodeData {
  id: string;
  content: string;
  children?: TreeNodeData[];
  value?: number;
}

export interface TreeVisualizerOptions {
  colorMode: 'none' | 'by-level' | 'by-path';
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
}

type PointNode = HierarchyNode<TreeNodeData> & {
  x?: number;
  y?: number;
  x0?: number;
  y0?: number;
  _children?: HierarchyNode<TreeNodeData>[];
};

export class TreeVisualizer {
  private container: HTMLElement;
  private svg: D3Selection<SVGSVGElement> | null = null;
  private g: D3Selection<SVGGElement> | null = null;
  private zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;

  // D3 Library
  private d3: D3 | null = null;

  // State
  private rootNode: HierarchyNode<TreeNodeData> | null = null;
  private expandedNodeIds = new Set<string>(['root-title']);
  private nodePositions = new Map<string, { x: number; y: number }>();
  private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private options: TreeVisualizerOptions;

  // Constants
  private nodeWidth = 140;
  private readonly nodeHeight = 40;
  private readonly transitionDuration = 350;
  private readonly doubleClickDelay = 250;

  private gradients = [
    { id: 'grad-std-primary', stops: ['#3b82f6', '#1d4ed8'] },
    { id: 'grad-std-warm', stops: ['#f97316', '#db2777'] },
    { id: 'grad-std-success', stops: ['#10b981', '#0ea5e9'] },
    { id: 'grad-std-accent', stops: ['#8b5cf6', '#d946ef'] },
    { id: 'grad-std-cool', stops: ['#06b6d4', '#3b82f6'] },
    { id: 'grad-std-deep', stops: ['#6366f1', '#a855f7'] },
  ];

  constructor(container: HTMLElement, options: TreeVisualizerOptions) {
    this.container = container;
    this.options = options;
  }

  public async initialize(): Promise<void> {
    try {
      // Lazy load the full d3 library to ensure all modules (like transition) are correctly patched
      this.d3 = await import('d3');

      if (!this.d3) {
        throw new Error('Failed to load D3 library');
      }

      // Verify critical D3 modules
      if (!this.d3.selection || !this.d3.select) {
        console.error('D3 selection module missing', this.d3);
        throw new Error('D3 selection module missing');
      }
      if (!this.d3.zoom) {
        console.error('D3 zoom module missing', this.d3);
        throw new Error('D3 zoom module missing');
      }
      if (!this.d3.hierarchy || !this.d3.tree) {
        console.error('D3 hierarchy module missing', this.d3);
        throw new Error('D3 hierarchy module missing');
      }

      console.log('D3 initialized successfully', {
        version: this.d3.version,
        hasZoom: !!this.d3.zoom,
        hasTree: !!this.d3.tree,
      });

      this.setupSVG();
    } catch (error) {
      console.error('TreeVisualizer initialization failed:', error);
      throw error;
    }
  }

  public updateOptions(newOptions: Partial<TreeVisualizerOptions>) {
    this.options = { ...this.options, ...newOptions };
    if (this.rootNode) {
      this.update(this.rootNode as PointNode);
    }
  }

  public setData(data: TreeNodeData | null) {
    if (!data || !this.d3) {
      this.rootNode = null;
      this.clear();
      return;
    }

    this.calculateNodeWidth(data);

    const root = this.d3.hierarchy(data);

    // Restore positions
    root.each((d: HierarchyNode<TreeNodeData>) => {
      const node = d as PointNode;
      const saved = this.nodePositions.get(node.data.id);

      if (saved) {
        node.x0 = saved.x;
        node.y0 = saved.y;
      } else if (node.parent && (node.parent as PointNode).x0 !== undefined) {
        node.x0 = (node.parent as PointNode).x0;
        node.y0 = (node.parent as PointNode).y0;
      } else {
        node.x0 = 0;
        node.y0 = 0;
      }

      if (node.children && !this.expandedNodeIds.has(node.data.id)) {
        node._children = node.children;
        node.children = undefined;
      }
    });

    this.rootNode = root;
    this.update(this.rootNode as PointNode);
  }

  public highlightNode(nodeId: string | null) {
    if (!this.g || !this.d3) return;

    this.g
      .selectAll('g.node')
      .classed(
        'is-selected',
        (d) => (d as PointNode).data.id === nodeId
      );
  }

  public setReadingNode(nodeId: string | null) {
    if (!this.g || !this.d3) return;

    this.g
      .selectAll('g.node')
      .classed(
        'is-reading',
        (d) => (d as PointNode).data.id === nodeId
      );
  }

  public panToNode(nodeId: string) {
    if (!this.rootNode) return;

    let targetNode: PointNode | undefined;
    this.rootNode.each((d: HierarchyNode<TreeNodeData>) => {
      if (d.data.id === nodeId) targetNode = d as PointNode;
    });

    if (targetNode) {
      this.expandPathToNode(targetNode);
      this.update(this.rootNode as PointNode);

      // Wait for update transition
      setTimeout(() => {
        if (targetNode) this.animatePan(targetNode);
      }, this.transitionDuration + 50);
    }
  }

  public highlightPathToNode(nodeId: string | null) {
    if (!this.g || !this.d3) return;

    if (!nodeId) {
      this.g
        .selectAll('g.node')
        .classed('is-dimmed is-ancestor is-descendant', false);
      this.g
        .selectAll('path.link')
        .classed('is-dimmed is-ancestor is-descendant', false);
      return;
    }

    let targetNode: PointNode | undefined;
    if (this.rootNode) {
      this.rootNode.each((d: HierarchyNode<TreeNodeData>) => {
        if (d.data.id === nodeId) targetNode = d as PointNode;
      });
    }

    if (!targetNode) return;

    this.g.selectAll('g.node, path.link').classed('is-dimmed', true);

    const ancestors = targetNode.ancestors();
    const descendants = targetNode.descendants();
    const ancestorIds = new Set(ancestors.map((n) => n.data.id));
    const descendantIds = new Set(descendants.map((n) => n.data.id));

    this.g
      .selectAll<SVGGElement, PointNode>('g.node')
      .filter((n) => ancestorIds.has(n.data.id))
      .classed('is-dimmed', false)
      .classed('is-ancestor', true);

    this.g
      .selectAll<SVGGElement, PointNode>('g.node')
      .filter((n) => descendantIds.has(n.data.id))
      .classed('is-dimmed', false)
      .classed('is-descendant', true);

    this.g
      .selectAll<SVGGElement, PointNode>('g.node')
      .filter((n) => n.data.id === targetNode!.data.id)
      .classed('is-ancestor', false);

    // Link casting fix
    this.g
      .selectAll('path.link')
      .filter((l) => {
        const link = l as { source: PointNode; target: PointNode };
        return (
          ancestorIds.has(link.source.data.id) &&
          ancestorIds.has(link.target.data.id)
        );
      })
      .classed('is-dimmed', false)
      .classed('is-ancestor', true);

    this.g
      .selectAll('path.link')
      .filter((l) => {
        const link = l as { source: PointNode; target: PointNode };
        return (
          descendantIds.has(link.source.data.id) &&
          descendantIds.has(link.target.data.id)
        );
      })
      .classed('is-dimmed', false)
      .classed('is-descendant', true);
  }

  public destroy() {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
  }

  public getRootNode(): HierarchyNode<TreeNodeData> | null {
    return this.rootNode;
  }

  // --- Private Methods ---

  private setupSVG() {
    if (!this.d3) return;

    // Create SVG if not exists
    let svgEl = this.container.querySelector('svg');
    if (!svgEl) {
      svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgEl.setAttribute('width', '100%');
      svgEl.setAttribute('height', '100%');
      this.container.appendChild(svgEl);
    }

    this.svg = this.d3.select(svgEl);

    // Defs
    this.ensureDefs();

    // Group
    this.g = this.svg.append('g').attr('class', 'content-group');

    // Zoom
    this.zoomBehavior = this.d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => {
        if (this.g) this.g.attr('transform', event.transform.toString());
      });

    this.svg.call(this.zoomBehavior).on('dblclick.zoom', null);

    // Initial centering
    const { height } = this.container.getBoundingClientRect();
    const initialTransform = this.d3.zoomIdentity.translate(80, height / 2);
    this.svg.call(this.zoomBehavior.transform, initialTransform);
  }

  private ensureDefs() {
    if (!this.svg || !this.d3) return;

    if (!this.svg.select('defs').empty()) return;

    const defs = this.svg.append('defs');

    // Drop Shadow
    const filter = defs
      .append('filter')
      .attr('id', 'drop-shadow-std')
      .attr('height', '130%');

    filter
      .append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3)
      .attr('result', 'blur');

    filter
      .append('feOffset')
      .attr('in', 'blur')
      .attr('dx', 2)
      .attr('dy', 2)
      .attr('result', 'offsetBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'offsetBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradients
    this.gradients.forEach((g) => {
      const gradient = defs
        .append('linearGradient')
        .attr('id', g.id)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', g.stops[0]);
      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', g.stops[1]);
    });
  }

  private calculateNodeWidth(data: TreeNodeData) {
    let maxTextWidth = 0;
    const traverse = (node: TreeNodeData) => {
      if (node.content) {
        const w = this.getTextWidth(node.content, '600 12px sans-serif');
        if (w > maxTextWidth) maxTextWidth = w;
      }
      if (node.children) node.children.forEach(traverse);
    };
    traverse(data);

    const targetWidth = maxTextWidth / 1.8 + 26;
    this.nodeWidth = Math.max(140, Math.min(600, targetWidth));
  }

  private getTextWidth(text: string, font: string): number {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 0;
    context.font = font;
    return context.measureText(text).width;
  }

  private update(source: PointNode) {
    if (!this.g || !this.rootNode || !this.d3) return;

    const dx = this.nodeHeight + 20;
    const dy = this.nodeWidth + 60;
    const treeLayout = this.d3.tree<TreeNodeData>().nodeSize([dx, dy]);
    const layoutRoot = treeLayout(this.rootNode) as PointNode;

    const nodes = layoutRoot.descendants().reverse() as PointNode[];
    const links = layoutRoot.links();

    // Save positions
    nodes.forEach((d: PointNode) => {
      this.nodePositions.set(d.data.id, { x: d.x ?? 0, y: d.y ?? 0 });
    });

    const transition = this.d3
      .select(this.g.node()!)
      .transition()
      .duration(this.transitionDuration);

    // Nodes
    const node = this.g
      .selectAll<SVGGElement, PointNode>('g.node')
      .data(nodes, (d: PointNode) => d.data.id);

    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', `translate(${source.y0 ?? 0},${source.x0 ?? 0})`)
      .attr('opacity', 0)
      .on('click', (_, d) => this.handleNodeClick(d))
      .on('dblclick', (event, d) => this.handleNodeDoubleClick(event, d))
      .on('mouseover', (_, d) => this.options.onNodeHover?.(d.data.id))
      .on('mouseout', () => this.options.onNodeHover?.(null));

    this.renderNodeContent(nodeEnter);

    const nodeUpdate = node.merge(nodeEnter);

    // Transition to new position
    (nodeUpdate.transition(transition as any) as any)
      .attr('transform', (d: PointNode) => `translate(${d.y ?? 0},${d.x ?? 0})`)
      .attr('opacity', 1);

    // Update content/styles
    this.updateNodeContent(nodeUpdate);

    // Exit
    (node.exit().transition(transition as any) as any)
      .remove()
      .attr('transform', `translate(${source.y ?? 0},${source.x ?? 0})`)
      .attr('opacity', 0);

    // Links
    const link = this.g
      .selectAll<
        SVGPathElement,
        Link<unknown, PointNode, PointNode>
      >('path.link')
      .data(links, (d) => (d as any).target.data.id);

    const linkEnter = link
      .enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const o = { x: source.x0 ?? 0, y: source.y0 ?? 0 } as PointNode;
        return this.linkPath({ source: o, target: o });
      });

    link
      .merge(linkEnter)
      .transition(transition as any)
      .attr('d', (d) => this.linkPath(d as any));

    (link.exit().transition(transition as any) as any)
      .remove()
      .attr('d', () => {
        const o = { x: source.x ?? 0, y: source.y ?? 0 } as PointNode;
        return this.linkPath({ source: o, target: o });
      });
  }

  private renderNodeContent(nodeEnter: any) {
    nodeEnter
      .append('rect')
      .attr('height', this.nodeHeight)
      .attr('rx', 4)
      .attr('y', -this.nodeHeight / 2);

    nodeEnter
      .append('foreignObject')
      .attr('height', this.nodeHeight)
      .attr('y', -this.nodeHeight / 2)
      .append('xhtml:div')
      .attr('class', 'node-label');

    nodeEnter.append('circle').attr('class', 'indicator').attr('r', 4);
  }

  private updateNodeContent(nodeUpdate: any) {
    nodeUpdate.select('rect').attr('width', this.nodeWidth);
    nodeUpdate.select('foreignObject').attr('width', this.nodeWidth);
    nodeUpdate.select('div.node-label').html((d: PointNode) => d.data.content);

    nodeUpdate.select('rect').each((d: unknown, i: number, nodes: any[]) => {
      const pointNode = d as PointNode;
      const colorUrl = this.getColorUrlForNode(pointNode);
      const rectEl = this.d3!.select(nodes[i]);
      const rectNode = nodes[i] as HTMLElement;
      const nodeGroup = this.d3!.select(rectNode.parentNode as Element);

      if (colorUrl) {
        rectNode.style.setProperty('--node-fill', colorUrl);
        rectEl.style('filter', 'url(#drop-shadow-std)');
        rectEl.style('stroke', 'none');
        nodeGroup.classed('has-color', true);
      } else {
        rectNode.style.setProperty(
          '--node-fill',
          'var(--color-background-raised)'
        );
        rectEl.style('stroke', 'var(--color-gray-400)');
        rectEl.style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
        nodeGroup.classed('has-color', false);
      }
    });

    nodeUpdate
      .select('.indicator')
      .attr('opacity', (d: PointNode) => (d.children || d._children ? 1 : 0))
      .classed('is-collapsed', (d: PointNode) => !!d._children)
      .attr(
        'transform',
        `translate(${this.nodeWidth - 10}, ${-this.nodeHeight / 2 + 10})`
      );
  }

  private linkPath(d: { source: PointNode; target: PointNode }) {
    const startX = (d.source.y ?? 0) + this.nodeWidth;
    const startY = d.source.x ?? 0;
    const endX = d.target.y ?? 0;
    const endY = d.target.x ?? 0;
    const midX = startX + (endX - startX) / 2;
    return `M ${startX},${startY} C ${midX},${startY} ${midX},${endY} ${endX},${endY}`;
  }

  private handleNodeClick(d: PointNode) {
    if (this.clickTimer) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }
    this.clickTimer = setTimeout(() => {
      if (d.children || d._children) {
        if (d.children) {
          d._children = d.children;
          d.children = undefined;
          this.expandedNodeIds.delete(d.data.id);
        } else {
          d.children = d._children;
          d._children = undefined;
          this.expandedNodeIds.add(d.data.id);
        }
        this.update(d);
      }
      this.options.onNodeClick?.(d.data.id);
    }, this.doubleClickDelay);
  }

  private handleNodeDoubleClick(event: Event, d: PointNode) {
    event.stopPropagation();
    if (this.clickTimer) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }
    this.options.onNodeDoubleClick?.(d.data.id);
  }

  private getColorUrlForNode(node: PointNode): string | null {
    if (this.options.colorMode === 'none') return null;

    let index = 0;
    if (this.options.colorMode === 'by-level') {
      const level = node.depth;
      if (level === 0) return null;
      index = (level - 1) % this.gradients.length;
    } else if (this.options.colorMode === 'by-path') {
      const ancestors = node.ancestors();
      const topLevelAncestor = ancestors[ancestors.length - 2];

      if (!topLevelAncestor) return null;

      const id = topLevelAncestor.data.id;
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash = hash & hash;
      }
      index = Math.abs(hash) % this.gradients.length;
    }

    return `url(#${this.gradients[index].id})`;
  }

  private expandPathToNode(targetNode: PointNode) {
    let changed = false;
    targetNode.ancestors().forEach((ancestor) => {
      if (
        ancestor.data.id !== targetNode.data.id &&
        !this.expandedNodeIds.has(ancestor.data.id)
      ) {
        if (ancestor._children) {
          ancestor.children = ancestor._children;
          ancestor._children = undefined;
          this.expandedNodeIds.add(ancestor.data.id);
          changed = true;
        }
      }
    });
    return changed;
  }

  private animatePan(targetNode: PointNode) {
    if (!this.svg || !this.zoomBehavior || !this.d3) return;

    const { width, height } = this.container.getBoundingClientRect();
    const currentTransform = this.d3.zoomTransform(this.svg.node()!);
    const currentScale = currentTransform.k;

    const newTransform = this.d3.zoomIdentity
      .translate(
        width / 2 - (targetNode.y ?? 0) * currentScale,
        height / 2 - (targetNode.x ?? 0) * currentScale
      )
      .scale(currentScale);

    this.svg
      .transition()
      .duration(this.transitionDuration + 200)
      .call(this.zoomBehavior.transform, newTransform);
  }

  private clear() {
    if (this.g) {
      this.g.selectAll('*').remove();
    }
  }
}
