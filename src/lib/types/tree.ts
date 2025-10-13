// src/lib/types/tree.ts

/**
 * Representa la estructura de datos para un único nodo en una visualización de árbol.
 * Es una definición limpia, agnóstica a la implementación de la UI (ej. D3),
 * que puede ser compartida entre servicios y componentes.
 */
export interface TreeNodeData {
  /** Un identificador único para el nodo (ej. 'node-123', 'root-title'). */
  id: string;

  /** El contenido de texto que se mostrará en el nodo. */
  content: string;

  /** Un array opcional de nodos hijos, representando la estructura jerárquica. */
  children?: TreeNodeData[];
}
