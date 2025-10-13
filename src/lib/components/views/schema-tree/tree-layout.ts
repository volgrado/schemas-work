// src/lib/components/views/schema-tree/tree-layout.ts
import * as d3 from 'd3';
import type { TreeNodeData } from '$lib/types';

export const nodeWidth = 140;
export const nodeHeight = 40;

export interface HierarchyPointNodeWithCustomData
  extends d3.HierarchyPointNode<TreeNodeData> {
  _children?: d3.HierarchyNode<TreeNodeData>[];
  x0?: number;
  y0?: number;
}

export function createTreeLayout(
  treeData: TreeNodeData,
  expandedNodeIds: Set<string>
) {
  const root = d3.hierarchy(treeData);

  root.descendants().forEach((d) => {
    const node = d as HierarchyPointNodeWithCustomData;
    if (node.children && !expandedNodeIds.has(node.data.id)) {
      node._children = node.children;
      node.children = undefined;
    }
  });

  const dx = nodeHeight + 20;
  const dy = nodeWidth + 60;
  const treeLayout = d3.tree<TreeNodeData>().nodeSize([dx, dy]);
  const layoutRoot = treeLayout(root);

  const nodes = layoutRoot.descendants() as HierarchyPointNodeWithCustomData[];
  const links = layoutRoot.links();

  return { nodes, links };
}
