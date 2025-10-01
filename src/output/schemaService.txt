// src/lib/services/features/schemaService.ts
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/types/tree';

export function documentToTreeData(
  doc: ProseMirrorNode | null
): TreeNodeData | null {
  console.log('--- [schemaService] Running documentToTreeData ---');

  if (!doc || doc.childCount === 0) {
    console.log('[schemaService] Returning null: Document is empty.');
    return null;
  }

  // Imprime la estructura completa del documento para depuración
  console.log('[schemaService] Document JSON structure:', doc.toJSON());

  let title = 'Esquema (sin título)';
  let mainList: ProseMirrorNode | undefined;

  doc.forEach((node) => {
    if (node.type.name === 'heading' && node.attrs.level === 1) {
      if (node.textContent.trim()) {
        title = node.textContent.trim();
        console.log(`[schemaService] Found title: "${title}"`);
      }
    }
    if (!mainList && node.type.name === 'bulletList') {
      mainList = node;
      console.log('[schemaService] Found main bulletList.');
    }
  });

  if (!mainList) {
    console.error(
      '[schemaService] ERROR: Returning null because no top-level bulletList was found.'
    );
    return null;
  }

  const root: TreeNodeData = {
    id: 'root-title',
    content: title,
    children: [],
  };

  function processList(listNode: ProseMirrorNode, parentArray: TreeNodeData[]) {
    listNode.forEach((listItem) => {
      if (listItem.type.name !== 'listItem') return;

      // --- LÓGICA REFACTORIZADA Y ROBUSTA ---

      let termParagraph: ProseMirrorNode | undefined;
      let nestedList: ProseMirrorNode | undefined;

      // 1. Buscamos explícitamente el párrafo con role="term"
      listItem.forEach((child) => {
        if (child.type.name === 'paragraph' && child.attrs.role === 'term') {
          termParagraph = child;
        } else if (child.type.name === 'bulletList') {
          nestedList = child;
        }
      });

      // 2. Si no encontramos un párrafo de "término", intentamos con el primer párrafo como fallback.
      //    Esto da resiliencia si la extensión de roles falla o el contenido es antiguo.
      if (!termParagraph) {
        termParagraph =
          listItem.firstChild?.type.name === 'paragraph'
            ? listItem.firstChild
            : undefined;
      }

      // --- FIN DE LA LÓGICA REFACTORIZADA ---

      // Solo creamos un nodo en el árbol si encontramos un párrafo de término.
      if (termParagraph) {
        const pos = listItem.attrs.pos;

        if (pos === null || pos === undefined) {
          console.warn(
            'Omitiendo listItem sin un atributo "pos" válido.',
            listItem
          );
          return;
        }

        // Usamos `textContent` que ignora el formato, pero si el texto está vacío, ponemos un placeholder.
        const content = termParagraph.textContent.trim() || '(Nodo sin título)';

        const newNode: TreeNodeData = {
          id: `node-${pos}`,
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

  console.log('[schemaService] Successfully generated tree data:', root);
  return root;
}
