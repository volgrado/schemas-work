/**
 * @file backupService.ts
 * @service
 * @description
 * Provides functionality for backing up and restoring the entire application state (Vault).
 * This includes exporting all documents (Schemas) and their content (Y.js updates)
 * to an encrypted JSON file, and restoring them from such a file.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { fileSystemStore } from '@modules/file-system';
import {
  encryptData,
  decryptData,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '$lib/core/utils/crypto';
import type { Vault } from '$lib/types';
import { toast } from 'svelte-sonner';
import * as errorService from '$lib/core/services/errorService';
import { i18n } from '$lib/utils/i18n.svelte';

// --- HELPER FUNCTIONS (INTERNAL) ---

/**
 * Prompts the user to select a `.json` file from their local machine.
 * This helper creates a hidden file input element, triggers a click, and resolves with the selected file.
 *
 * @returns {Promise<File | null>} A promise that resolves with the selected `File` object, or `null` if the user cancels.
 */
function selectFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      resolve(input.files ? input.files[0] : null);
      document.body.removeChild(input);
    };
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Reads the content of a `File` object as a text string using the FileReader API.
 *
 * @param {File} file - The `File` object to be read.
 * @returns {Promise<string>} A promise that resolves with the file's text content.
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
 * Wipes all application data from the browser's storage (IndexedDB and FileSystemStore).
 * This is a destructive operation performed before a full restore.
 *
 * @returns {Promise<void>} A promise that resolves when all data has been successfully cleared.
 */
async function clearAllData(): Promise<void> {
  const allItems = fileSystemStore.getAll();
  const schemasToDelete = allItems.filter((item) => item.type === 'schema');

  const deletionPromises = schemasToDelete.map(
    (schema) =>
      new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(schema.id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(request.error || event);
        request.onblocked = (event) =>
          reject(
            new Error(
              `Database deletion for schema '${schema.id}' is blocked. Close other tabs.`
            )
          );
      })
  );
  await Promise.all(deletionPromises);
  await fileSystemStore.clear();
}

/**
 * Performs a basic structural validation of the decrypted vault data.
 * Ensures the object has the required `schemas` array and `content` map.
 *
 * @param {any} data - The data object to validate.
 * @returns {boolean} True if the data matches the `Vault` interface structure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isValidVault(data: any): data is Vault {
  return (
    data &&
    Array.isArray(data.schemas) &&
    typeof data.content === 'object' &&
    data.content !== null
  );
}

// =================================================================
// --- PUBLIC API ---
// =================================================================

/**
 * Exports the user's entire vault to an encrypted, downloadable JSON file.
 *
 * This process involves:
 * 1. Gathering all schema metadata from the File System.
 * 2. extracting the full Y.js state for each document from IndexedDB.
 * 3. Compiling this data into a `Vault` object.
 * 4. Encrypting the `Vault` object with the provided password.
 * 5. Triggering a browser download of the encrypted JSON file.
 *
 * @param {string} password - The password to use for encrypting the vault.
 * @returns {Promise<void>}
 */
export async function exportVault(password: string): Promise<void> {
  const _t = i18n.t;
  try {
    if (!password) {
      throw new Error(_t('backup_service.errors.password_required_export'));
    }

    const allItems = fileSystemStore.getAll();
    const schemasToExport = allItems.filter((item) => item.type === 'schema');

    const content: Record<string, string> = {};
    const providers: {
      provider: IndexeddbPersistence;
      ydoc: Y.Doc;
      id: string;
    }[] = [];

    // Initialize Y.js docs and providers for all schemas to read their state.
    for (const schema of schemasToExport) {
      const ydoc = new Y.Doc();
      const provider = new IndexeddbPersistence(schema.id, ydoc);
      providers.push({ provider, ydoc, id: schema.id });
    }

    // Wait for all providers to sync with IndexedDB.
    await Promise.all(providers.map((p) => p.provider.whenSynced));

    // Encode the state of each document.
    for (const p of providers) {
      const update = Y.encodeStateAsUpdate(p.ydoc);
      content[p.id] = uint8ArrayToBase64(update);
      p.provider.destroy();
    }

    const vault: Vault = { schemas: allItems, content };
    const vaultJson = JSON.stringify(vault);
    const encryptedVault = await encryptData(password, vaultJson);
    const encryptedJson = JSON.stringify(encryptedVault, null, 2);

    // Create and trigger download.
    const blob = new Blob([encryptedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schemas-work-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(_t('backup_service.toast.export_success'));
  } catch (error) {
    errorService.reportError(error, { operation: 'exportVault' });
    toast.error(_t('backup_service.toast.export_failed_title'), {
      description: _t('backup_service.toast.export_failed_desc'),
    });
    throw error;
  }
}

/**
 * Imports and restores a user's vault from an encrypted JSON file.
 *
 * This process involves:
 * 1. Asking the user to select a backup file.
 * 2. Decrypting the file content using the provided password.
 * 3. Validating the vault structure.
 * 4. Wiping existing data (Clear All).
 * 5. Restoring schema metadata to the File System.
 * 6. Rehydrating the Y.js documents in IndexedDB from the binary updates.
 *
 * @param {string} password - The password required to decrypt the selected vault file.
 * @returns {Promise<void>}
 */
export async function importVault(password: string): Promise<void> {
  let file: File | null = null;
  const _t = i18n.t;
  try {
    file = await selectFile();
    if (!file) return;

    const fileContent = await readFile(file);

    if (!password) {
      toast.error(_t('backup_service.toast.password_required_import'));
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let encryptedJson;
    try {
      encryptedJson = JSON.parse(fileContent);
    } catch (parseError) {
      errorService.reportError(parseError, {
        operation: 'importVault.parseFileContent',
        fileName: file?.name,
      });
      throw new Error(_t('backup_service.errors.invalid_json_file'));
    }

    const vaultJson = await decryptData(password, encryptedJson);
    const vault: Vault = JSON.parse(vaultJson);

    if (!isValidVault(vault)) {
      const validationError = new Error(
        _t('backup_service.errors.corrupt_vault')
      );
      errorService.reportError(validationError, {
        operation: 'importVault.validateVaultStructure',
        fileName: file?.name,
      });
      throw validationError;
    }

    // Data wipe and restore sequence
    await clearAllData();
    await fileSystemStore.restore(vault.schemas);

    for (const schemaId in vault.content) {
      const ydoc = new Y.Doc();
      const provider = new IndexeddbPersistence(schemaId, ydoc);
      await provider.whenSynced;
      const update = base64ToUint8Array(vault.content[schemaId]);
      Y.applyUpdate(ydoc, update);
      provider.destroy();
    }

    toast.success(_t('backup_service.toast.import_success'));
    setTimeout(() => window.location.reload(), 2000);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'importVault.general',
      fileName: file?.name,
      fileSize: file?.size,
    });
    toast.error(_t('backup_service.toast.import_failed_title'), {
      description: _t('backup_service.toast.import_failed_desc'),
    });
  }
}
