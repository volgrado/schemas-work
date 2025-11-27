/**
 * @file types.ts
 * @module visualization
 * @description
 * Defines the domain types for the visualization module.
 */

export namespace Viz {
  export interface TreeNode {
    id: string;
    content: string;
    children?: TreeNode[];
  }
}

/**
 * Defines the public interface for the data of a single node in the tree.
 */
export interface TreeNodeData {
  id: string;
  content: string;
  children?: TreeNodeData[];
  value?: number; // Word count or other metric
}
