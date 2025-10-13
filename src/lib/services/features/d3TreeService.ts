import { select } from 'd3-selection';
import { hierarchy, tree } from 'd3-hierarchy';
import { zoom, zoomIdentity } from 'd3-zoom';
import { transition } from 'd3-transition';
import type { TreeNodeData } from '$lib/types/tree';
import type { HierarchyPointNode } from 'd3-hierarchy';
import { CSS_CLASSES } from '$lib/constants';

export interface D3TreeServiceOptions {
  svgEl: SVGSVGElement;
  treeData: TreeNodeData;
  selectedNodeId: string | null;
  onNodeClick: (id: string) => void;
}

interface HierarchyPointNodeWithCustomData extends HierarchyPointNode<TreeNodeData> {
  _children?: d3.HierarchyNode<TreeNodeData>[];
  x0?: number;
  y0?: number;
}

const nodeWidth = 140;
const nodeHeight = 40;
const transitionDuration = 300;

export function createD3Tree(options: D3TreeServiceOptions) {
  const { svgEl, treeData, selectedNodeId, onNodeClick } = options;
  const svg = select(svgEl);
  svg.selectAll('*').remove(); // Clear previous render

  const g = svg.append('g').attr('class', CSS_CLASSES.CONTENT_GROUP);

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 2])
    .on('zoom', (event) => g.attr('transform', event.transform.toString()));

  svg.call(zoomBehavior).on('dblclick.zoom', null);

  const root = hierarchy(treeData);
  const rootWithCoords = root as HierarchyPointNodeWithCustomData;
  rootWithCoords.x0 = (svgEl.clientHeight || 0) / 2;
  rootWithCoords.y0 = 0;

  update(rootWithCoords, root);

  function update(source: HierarchyPointNodeWithCustomData, rootNode: d3.HierarchyNode<TreeNodeData>) {
    const g = select(svgEl).select<SVGGElement>(`.${CSS_CLASSES.CONTENT_GROUP}`);
    if (g.empty()) return;

    const dx = nodeHeight + 20;
    const dy = nodeWidth + 60;
    const treeLayout = tree<TreeNodeData>().nodeSize([dx, dy]);
    const layoutRoot = treeLayout(rootNode);
    const nodes = layoutRoot.descendants().reverse() as HierarchyPointNodeWithCustomData[];
    const links = layoutRoot.links();

    const trans = transition().duration(transitionDuration);

    const node = g
      .selectAll<SVGGElement, HierarchyPointNodeWithCustomData>(`.${CSS_CLASSES.NODE}`)
      .data(nodes, (d) => d.data.id);

    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', CSS_CLASSES.NODE)
      .attr('transform', `translate(${source.y0 ?? 0},${source.x0 ?? 0})`)
      .attr('opacity', 0)
      .on('click', (event: MouseEvent, d: HierarchyPointNodeWithCustomData) => {
        // This will be handled by the Svelte component
      })
      .on('dblclick', (event: MouseEvent, d: HierarchyPointNodeWithCustomData) => {
        event.stopPropagation();
        onNodeClick(d.data.id);
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
      .attr('class', CSS_CLASSES.NODE_LABEL)
      .html((d) => d.data.content);

    nodeEnter.append('circle').attr('class', CSS_CLASSES.INDICATOR).attr('r', 4);

    const nodeUpdate = node.merge(nodeEnter);
    nodeUpdate.classed(CSS_CLASSES.IS_SELECTED, (d) => d.data.id === selectedNodeId);
    nodeUpdate.select(`div.${CSS_CLASSES.NODE_LABEL}`).html((d) => d.data.content);
    nodeUpdate
      .select<SVGCircleElement>(`.${CSS_CLASSES.INDICATOR}`)
      .attr('opacity', (d) => (d.children || d._children ? 1 : 0))
      .classed(CSS_CLASSES.IS_COLLAPSED, (d) => !!d._children)
      .attr('transform', `translate(${nodeWidth - 10}, ${-nodeHeight / 2 + 10})`);

    nodeUpdate
      .transition(trans)
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .attr('opacity', 1);

    node
      .exit()
      .transition(trans)
      .remove()
      .attr('transform', `translate(${source.y},${source.x})`)
      .attr('opacity', 0);

    const link = g
      .selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNodeData>>(`path.${CSS_CLASSES.LINK}`)
      .data(links, (d) => d.target.data.id);

    function customLinkGenerator(d: HierarchyPointLink<TreeNodeData>) {
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
      .attr('class', CSS_CLASSES.LINK)
      .attr('d', () => {
        const o = {
          source: { y: source.y0 ?? 0, x: source.x0 ?? 0 },
          target: { y: source.y0 ?? 0, x: source.x0 ?? 0 },
        };
        return customLinkGenerator(o as any);
      })
      .merge(link)
      .transition(trans)
      .attr('d', customLinkGenerator);

    link
      .exit()
      .transition(trans)
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
}