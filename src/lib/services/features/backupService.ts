// src/lib/services/features/backupService.ts

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as directoryService from '$lib/services/core/directoryService';
import {
  encryptData,
  decryptData,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '$lib/utils/crypto';
import type { Vault, SchemaMetadata } from '$lib/types';
import { toast } from 'svelte-sonner';
import * as errorService from '$lib/services/core/errorService';

/**
 * Orquesta la exportación de la bóveda completa del usuario a un
 * archivo JSON encriptado y descargable.
 */
export async function exportVault(password: string): Promise<void> {
  // *** NUEVO: Envolvemos toda la función para capturar cualquier error ***
  try {
    if (!password) {
      throw new Error('Se requiere una contraseña para exportar la bóveda.');
    }

    // 1. Obtener TODOS los ítems para guardar la estructura completa (carpetas y esquemas)
    const allItems = await directoryService.getAllItems();

    // 2. Filtrar para obtener solo los esquemas, ya que solo ellos tienen contenido
    const schemasToExport = allItems.filter((item) => item.type === 'schema');

    const content: Record<string, string> = {};
    const providers: {
      provider: IndexeddbPersistence;
      ydoc: Y.Doc;
      id: string;
    }[] = [];

    for (const schema of schemasToExport) {
      const ydoc = new Y.Doc();
      const provider = new IndexeddbPersistence(schema.id, ydoc);
      providers.push({ provider, ydoc, id: schema.id });
    }

    await Promise.all(providers.map((p) => p.provider.whenSynced));

    for (const p of providers) {
      const update = Y.encodeStateAsUpdate(p.ydoc);
      content[p.id] = uint8ArrayToBase64(update);
      p.provider.destroy();
    }

    // 3. Crear la bóveda. La propiedad `schemas` ahora contiene todos los ítems.
    const vault: Vault = { schemas: allItems, content };
    const vaultJson = JSON.stringify(vault);

    const encryptedVault = await encryptData(password, vaultJson);
    const encryptedJson = JSON.stringify(encryptedVault, null, 2);

    // --- Parte Crítica a Proteger ---
    const blob = new Blob([encryptedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schemas-work-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); // Es buena práctica añadirlo al DOM antes de hacer clic
    a.click();

    // Limpieza
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Si todo va bien, mostramos el toast de éxito
    toast.success('Bóveda exportada correctamente.');
  } catch (error) {
    errorService.reportError(error, { operation: 'exportVault' });
    toast.error('La exportación ha fallado.', {
      description:
        'No se pudo generar el archivo de respaldo. Revisa la consola para más detalles.',
    });
    // Relanzamos el error por si el llamador necesita saber que falló
    throw error;
  }
}

/**
 * Orquesta la importación y restauración de una bóveda desde un archivo
 * JSON encriptado.
 */
export async function importVault(password: string): Promise<void> {
  let file: File | null = null;
  try {
    file = await selectFile();
    if (!file) return;

    const fileContent = await readFile(file);

    if (!password) {
      toast.error('Se requiere una contraseña para importar la bóveda.');
      return; // No es un error técnico, sino de flujo, así que no lo registramos.
    }

    let encryptedJson;
    try {
      encryptedJson = JSON.parse(fileContent); // *** Punto de fallo #1 ***
    } catch (parseError) {
      // Si el archivo en sí no es un JSON válido, lo registramos y lanzamos un error más específico.
      errorService.reportError(parseError, {
        operation: 'importVault.parseFileContent',
        fileName: file?.name,
      });
      throw new Error(
        'El archivo seleccionado no es un archivo de respaldo JSON válido.'
      );
    }

    const vaultJson = await decryptData(password, encryptedJson);

    const vault: Vault = JSON.parse(vaultJson); // *** Punto de fallo #2 (después de desencriptar) ***

    if (!isValidVault(vault)) {
      const validationError = new Error(
        'Vault data is corrupt or has an invalid format after decryption.'
      );
      errorService.reportError(validationError, {
        operation: 'importVault.validateVaultStructure',
        fileName: file?.name,
      });
      throw validationError;
    }

    // ... (resto de la lógica de importación)
  } catch (error) {
    // Este `catch` general ahora capturará los errores que lanzamos manualmente,
    // así como los errores de desencriptación (contraseña incorrecta).
    errorService.reportError(error, {
      operation: 'importVault.general',
      fileName: file?.name,
      fileSize: file?.size,
    });

    toast.error('La importación ha fallado.', {
      description:
        'Es posible que la contraseña sea incorrecta o que el archivo esté corrupto o no sea válido.',
    });
  }
}

// --- FUNCIONES DE AYDA (Helpers) ---

function selectFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      resolve(input.files ? input.files[0] : null);
    };
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function clearAllData(): Promise<void> {
  // Obtenemos todos los ítems y filtramos para encontrar solo los esquemas,
  // que son los únicos que tienen una base de datos IndexedDB asociada.
  const allItems = await directoryService.getAllItems();
  const schemasToDelete = allItems.filter((item) => item.type === 'schema');

  const deletionPromises = schemasToDelete.map(
    (schema) =>
      new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(schema.id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(request.error || event);
        request.onblocked = (event) =>
          reject(
            new Error(`La eliminación de la BD '${schema.id}' está bloqueada.`)
          );
      })
  );
  await Promise.all(deletionPromises);
  await directoryService.clearDirectory();
}

function isValidVault(data: any): data is Vault {
  return (
    data &&
    Array.isArray(data.schemas) &&
    typeof data.content === 'object' &&
    data.content !== null
  );
}
