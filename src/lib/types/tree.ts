/**
 * @file Defines the hierarchical data structure used for the D3.js tree visualization component.
 * @module tree
 */

/**
 * Represents a node in the D3.js tree visualization.
 */
export interface TreeNodeData {
  /** A unique identifier for the node, typically corresponding to the `nodeId` from the ProseMirror document. */
  id: string;
  /** The text content to be displayed for the node. */
  content: string;
  /** An optional array of child nodes, defining the hierarchical structure. */
  children?: TreeNodeData[];
}
