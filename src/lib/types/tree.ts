/**
 * @file Defines the hierarchical data structure used for the D3.js tree visualization component.
 * @remarks This type definition is specifically tailored for compatibility with D3's tree layout,
 * which expects a recursive structure of nodes. Each node represents an element from the main
 * document, such as a heading or a list item, and can have its own children.
 */

export interface TreeNodeData {
  /** A unique identifier for the node, typically corresponding to the `nodeId` from the ProseMirror document. */
  id: string;
  /** The text content to be displayed for the node in the visualization. */
  content: string;
  /** An optional array of child nodes, which defines the hierarchical structure of the tree. */
  children?: TreeNodeData[];
}
