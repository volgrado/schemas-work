import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// Usamos un nombre de base de datos específico para nuestra aplicación.
const DB_NAME = 'schemas-work-db';

/**
 * Crea y devuelve un proveedor de persistencia para un documento Y.js específico.
 * Este servicio encapsula la lógica de configuración de y-indexeddb.
 *
 * @param docId - El identificador único del documento que se quiere persistir.
 * @returns Un objeto que contiene el documento Y.js (Y.Doc) y el proveedor de persistencia.
 */
export function getDocumentProvider(docId: string) {
  const ydoc = new Y.Doc();
  
  // El proveedor de persistencia se encarga de:
  // 1. Cargar el estado del documento desde IndexedDB cuando se crea.
  // 2. Guardar automáticamente cualquier cambio en el documento a IndexedDB.
  const provider = new IndexeddbPersistence(docId, ydoc);

  return {
    ydoc,
    provider,
    // Podríamos añadir aquí métodos para destruir la conexión, etc. en el futuro.
  };
}