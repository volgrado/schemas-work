import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/types/tree';

/**
 * Servicio que contiene la lógica de negocio para interpretar y transformar
 * la estructura de un documento de esquema (ProseMirror/Tiptap).
 */

/**
 * Convierte un documento ProseMirror completo a una estructura de datos jerárquica
 * (TreeNodeData), ideal para ser consumida por componentes de UI como una vista de árbol.
 * @param doc El nodo raíz del documento ProseMirror (de editor.state.doc).
 * @returns Un objeto TreeNodeData que representa la jerarquía del esquema, o null si no se puede generar.
 */
export function documentToTreeData(
  doc: ProseMirrorNode | null
): TreeNodeData | null {
  if (!doc || doc.childCount === 0) {
    return null;
  }

  // --- 1. Descubrimiento del Título (Busca un H1) ---
  // ✅ ACTUALIZADO: Buscamos un heading de nivel 1 para alinearnos con la salida de la IA.
  let title = 'Esquema (sin título)';
  doc.descendants((node) => {
    if (node.type.name === 'heading' && node.attrs.level === 2) {
      // <-- Cambio de 2 a 1
      if (node.textContent.trim()) {
        title = node.textContent.trim();
        return false; // Detenemos la búsqueda una vez encontrado
      }
    }
    return true;
  });

  // --- 2. Selección Inteligente de la Lista Principal ---
  let mainList: ProseMirrorNode | undefined;
  const topLevelLists: ProseMirrorNode[] = [];
  doc.forEach((node) => {
    if (node.type.name === 'bulletList') {
      topLevelLists.push(node);
    }
  });

  if (topLevelLists.length > 0) {
    mainList = topLevelLists.reduce((prev, current) =>
      prev.childCount > current.childCount ? prev : current
    );
  } else {
    doc.descendants((node) => {
      if (mainList) return false;
      if (node.type.name === 'bulletList') {
        mainList = node;
        return false;
      }
      return true;
    });
  }

  if (!mainList) {
    return null;
  }

  // --- 3. Generación del Árbol ---
  const root: TreeNodeData = {
    id: 'root-title',
    content: title,
    children: [],
  };

  function processList(listNode: ProseMirrorNode, parentArray: TreeNodeData[]) {
    listNode.forEach((listItem) => {
      if (listItem.type.name !== 'listItem') return;

      let termParagraph: ProseMirrorNode | undefined;
      let nestedList: ProseMirrorNode | undefined;
      let firstParagraphFallback: ProseMirrorNode | undefined;

      listItem.forEach((child) => {
        if (child.type.name === 'paragraph') {
          if (child.attrs.role === 'term') {
            termParagraph = child;
          } else if (!firstParagraphFallback) {
            firstParagraphFallback = child;
          }
        } else if (child.type.name === 'bulletList') {
          nestedList = child;
        }
      });

      const paragraphForContent = termParagraph || firstParagraphFallback;

      if (paragraphForContent) {
        // La posición se añade a través de la PositionSyncExtension
        const pos = listItem.attrs.pos;
        if (pos === null || pos === undefined) {
          return;
        }

        const content =
          paragraphForContent.textContent.trim() || '(Nodo sin título)';
        const newNode: TreeNodeData = {
          id: `node-${pos}`, // Usamos la posición para un ID estable
          content: content,
          children: [],
        };
        parentArray.push(newNode);

        if (nestedList && newNode.children) {
          processList(nestedList, newNode.children);
        }
      }
    });
  }

  if (root.children) {
    processList(mainList, root.children);
  }

  return root;
}

/**
 * ⭐ NUEVA FUNCIÓN
 * Genera una ruta de "migas de pan" (breadcrumb) para un nodo en una posición dada.
 * Esta ruta se utiliza para dar contexto a la IA al expandir un nodo.
 * @param doc El documento completo de ProseMirror (obtenido de editor.state.doc).
 * @param pos La posición del nodo 'listItem' del que queremos la ruta.
 * @returns Un string como "Tema Principal > Subtema > Concepto Actual".
 */
export function getBreadcrumbForPosition(
  doc: ProseMirrorNode,
  pos: number
): string {
  const path: string[] = [];
  // `doc.resolve(pos)` nos da acceso a toda la información jerárquica en esa posición.
  const resolvedPos = doc.resolve(pos);

  // Recorremos el árbol hacia arriba desde la profundidad del nodo actual hasta la raíz.
  for (let i = resolvedPos.depth; i > 0; i--) {
    const parentNode = resolvedPos.node(i);

    // Solo nos interesan los 'listItem' en la ruta para construir el breadcrumb.
    if (parentNode.type.name === 'listItem') {
      // Por nuestra estructura, el primer hijo de un 'listItem' es el párrafo
      // que contiene el término o la clave.
      const termParagraph = parentNode.content.firstChild;
      if (termParagraph && termParagraph.textContent.trim()) {
        // Añadimos el texto al PRINCIPIO del array para construir la ruta en el orden correcto.
        path.unshift(termParagraph.textContent.trim());
      }
    }
  }

  if (path.length === 0) {
    return 'Raíz del esquema';
  }

  return path.join(' > ');
}
