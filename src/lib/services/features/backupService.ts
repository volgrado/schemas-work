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
 * Orchestrates the export of the user's entire vault to an
 * encrypted and downloadable JSON file.
 * @param {string} password - The password to encrypt the vault.
 * @returns {Promise<void>} A promise that resolves when the export is complete.
 */
export async function exportVault(password: string): Promise<void> {
  try {
    if (!password) {
      throw new Error('A password is required to export the vault.');
    }

    const allItems = await directoryService.getAllItems();
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

    const vault: Vault = { schemas: allItems, content };
    const vaultJson = JSON.stringify(vault);

    const encryptedVault = await encryptData(password, vaultJson);
    const encryptedJson = JSON.stringify(encryptedVault, null, 2);

    const blob = new Blob([encryptedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schemas-work-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Vault exported successfully.');
  } catch (error) {
    errorService.reportError(error, { operation: 'exportVault' });
    toast.error('Export failed.', {
      description:
        'Could not generate the backup file. Check the console for more details.',
    });
    throw error;
  }
}

/**
 * Orchestrates the import and restoration of a vault from an
 * encrypted JSON file.
 * @param {string} password - The password to decrypt the vault.
 * @returns {Promise<void>} A promise that resolves when the import is complete.
 */
export async function importVault(password: string): Promise<void> {
  let file: File | null = null;
  try {
    file = await selectFile();
    if (!file) return;

    const fileContent = await readFile(file);

    if (!password) {
      toast.error('A password is required to import the vault.');
      return;
    }

    let encryptedJson;
    try {
      encryptedJson = JSON.parse(fileContent);
    } catch (parseError) {
      errorService.reportError(parseError, {
        operation: 'importVault.parseFileContent',
        fileName: file?.name,
      });
      throw new Error(
        'The selected file is not a valid JSON backup file.',
      );
    }

    const vaultJson = await decryptData(password, encryptedJson);
    const vault: Vault = JSON.parse(vaultJson);

    if (!isValidVault(vault)) {
      const validationError = new Error(
        'Vault data is corrupt or has an invalid format after decryption.',
      );
      errorService.reportError(validationError, {
        operation: 'importVault.validateVaultStructure',
        fileName: file?.name,
      });
      throw validationError;
    }

    await clearAllData();
    await directoryService.saveDirectory(vault.schemas);

    for (const schemaId in vault.content) {
      const ydoc = new Y.Doc();
      const provider = new IndexeddbPersistence(schemaId, ydoc);
      await provider.whenSynced;
      const update = base64ToUint8Array(vault.content[schemaId]);
      Y.applyUpdate(ydoc, update);
      provider.destroy();
    }

    toast.success('Vault imported successfully. The page will now reload.');
    setTimeout(() => window.location.reload(), 2000);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'importVault.general',
      fileName: file?.name,
      fileSize: file?.size,
    });

    toast.error('Import failed.', {
      description:
        'The password may be incorrect, or the file may be corrupt or invalid.',
    });
  }
}

/**
 * Prompts the user to select a file.
 * @returns {Promise<File | null>} A promise that resolves with the selected file or null if canceled.
 */
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

/**
 * Reads the content of a file as a string.
 * @param {File} file - The file to read.
 * @returns {Promise<string>} A promise that resolves with the file's content.
 */
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Clears all application data, including IndexedDB databases and localStorage.
 * @returns {Promise<void>} A promise that resolves when all data has been cleared.
 */
async function clearAllData(): Promise<void> {
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
            new Error(`Database deletion for '${schema.id}' is blocked.`),
          );
      }),
  );
  await Promise.all(deletionPromises);
  await directoryService.clearDirectory();
}

/**
 * Validates the structure of the vault data.
 * @param {any} data - The data to validate.
 * @returns {data is Vault} True if the data is a valid vault, false otherwise.
 */
function isValidVault(data: any): data is Vault {
  return (
    data &&
    Array.isArray(data.schemas) &&
    typeof data.content === 'object' &&
    data.content !== null
  );
}
