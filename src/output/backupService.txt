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

/**
 * Orquesta la exportación de la bóveda completa del usuario a un
 * archivo JSON encriptado y descargable.
 */
export async function exportVault(password: string): Promise<void> {
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

  const blob = new Blob([encryptedJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schemas-work-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Orquesta la importación y restauración de una bóveda desde un archivo
 * JSON encriptado.
 */
export async function importVault(password: string): Promise<void> {
  try {
    const file = await selectFile();
    if (!file) return;

    const fileContent = await readFile(file);

    if (!password) {
      toast.error('Se requiere una contraseña para importar la bóveda.');
      return;
    }

    const encryptedJson = JSON.parse(fileContent);
    const vaultJson = await decryptData(password, encryptedJson);
    const vault: Vault = JSON.parse(vaultJson);

    if (!isValidVault(vault)) {
      throw new Error(
        'El archivo de la bóveda está corrupto o tiene un formato incorrecto.'
      );
    }

    await clearAllData();

    // `vault.schemas` contiene la estructura completa (carpetas y esquemas),
    // que `saveDirectory` guardará correctamente.
    await directoryService.saveDirectory(vault.schemas);

    // Este bucle sigue funcionando bien, ya que `vault.content` solo
    // contiene las claves de los esquemas.
    for (const schemaId in vault.content) {
      if (Object.prototype.hasOwnProperty.call(vault.content, schemaId)) {
        const ydoc = new Y.Doc();
        const update = base64ToUint8Array(vault.content[schemaId]);
        Y.applyUpdate(ydoc, update);
        const provider = new IndexeddbPersistence(schemaId, ydoc);
        await provider.whenSynced;
        provider.destroy();
      }
    }

    toast.success(
      '¡Importación completada! La aplicación se recargará ahora.',
      {
        duration: 5000,
        onDismiss: () => window.location.reload(),
        onAutoClose: () => window.location.reload(),
      }
    );
  } catch (error) {
    console.error('Error durante la importación:', error);
    toast.error('La importación ha fallado.', {
      description:
        'Es posible que la contraseña sea incorrecta o que el archivo esté corrupto.',
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
