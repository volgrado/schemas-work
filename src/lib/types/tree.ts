// src/lib/types/tree.ts

/**
 * Defines the hierarchical data structure used
 * for the D3 tree visualization.
 */
export interface TreeNodeData {
  /** A unique identifier for the node. */
  id: string;
  /** The text content to be displayed for the node. */
  content: string;
  /** An optional array of child nodes, representing the hierarchy. */
  children?: TreeNodeData[];
}
