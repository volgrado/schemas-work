// src/lib/types/tree.ts

/**
 * Define la estructura de datos jerárquica que se utiliza
 * para la visualización del árbol de D3.
 */
export interface TreeNodeData {
  id: string;
  content: string;
  children?: TreeNodeData[];
}
