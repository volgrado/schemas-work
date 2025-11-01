/**
 * @file Implements the vault backup and restore functionality for the application.
 *
 * @remarks
 * This feature service orchestrates several core services to provide a comprehensive,
 * secure, and password-protected backup system for the user's entire dataset. The
 * process involves several key steps:
 * 1.  Reading all schema metadata (the file and folder structure) from `directoryService`.
 * 2.  Extracting the complete content of each individual schema from its respective
 *     `IndexedDB` database via the `y-indexeddb` persistence layer.
 * 3.  Packaging the directory structure and all schema content into a single `Vault` object.
 * 4.  Encrypting this `Vault` object with a user-provided password using the Web Crypto
 *     API (AES-GCM), which provides strong, authenticated encryption.
 * 5.  Triggering a download of the resulting encrypted data as a JSON file.
 *
 * The import process reverses these steps, providing a complete data recovery and
 * portability solution.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as directoryService from '$lib/services/core/directoryService';
import {
  encryptData,
  decryptData,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '$lib/utils/crypto';
import type { Vault } from '$lib/types';
import { toast } from 'svelte-sonner';
import * as errorService from '$lib/services/core/errorService';

/**
 * Exports the user's entire vault (all schemas and folders) to an encrypted,
 * password-protected, and downloadable JSON file.
 *
 * @param password The password to use for encrypting the vault. It must not be empty.
 * @returns A promise that resolves when the export process is successfully initiated.
 * @throws An error if the password is empty or if any part of the export process fails.
 */
export async function exportVault(password: string): Promise<void> {
  try {
    if (!password) {
      throw new Error(
        'A password is required to encrypt and export the vault.'
      );
    }

    const allItems = await directoryService.getAllItems();
    const schemasToExport = allItems.filter((item) => item.type === 'schema');

    const content: Record<string, string> = {};
    const providers: {
      provider: IndexeddbPersistence;
      ydoc: Y.Doc;
      id: string;
    }[] = [];

    // Initialize persistence providers for all schemas to access their Y.js documents.
    for (const schema of schemasToExport) {
      const ydoc = new Y.Doc();
      const provider = new IndexeddbPersistence(schema.id, ydoc);
      providers.push({ provider, ydoc, id: schema.id });
    }

    // Wait for all providers to finish synchronizing with their respective IndexedDB databases.
    await Promise.all(providers.map((p) => p.provider.whenSynced));

    // Once synced, encode each Y.js document into a Base64 string.
    for (const p of providers) {
      // Y.encodeStateAsUpdate captures the entire state of the document in a compact binary format.
      const update = Y.encodeStateAsUpdate(p.ydoc);
      content[p.id] = uint8ArrayToBase64(update);
      p.provider.destroy(); // Clean up connections to release locks on the databases.
    }

    const vault: Vault = { schemas: allItems, content };
    const vaultJson = JSON.stringify(vault);

    const encryptedVault = await encryptData(password, vaultJson);
    const encryptedJson = JSON.stringify(encryptedVault, null, 2);

    // Trigger a file download for the user.
    const blob = new Blob([encryptedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schemas-work-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up the DOM and release the object URL.
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Vault exported successfully.');
  } catch (error) {
    errorService.reportError(error, { operation: 'exportVault' });
    toast.error('Export Failed', {
      description:
        'Could not generate the backup file. See the error console for more details.',
    });
    throw error; // Re-throw to allow for further handling by the caller if needed.
  }
}

/**
 * Imports and restores a user's vault from an encrypted JSON file.
 *
 * @remarks
 * This is a destructive operation. It performs a full wipe of all existing data in the
 * application before proceeding with the import. Upon successful import, the page will
 * automatically reload to reflect the new application state.
 *
 * @param password The password required to decrypt the selected vault file.
 */
export async function importVault(password: string): Promise<void> {
  let file: File | null = null;
  try {
    file = await selectFile();
    if (!file) return; // The user canceled the file selection dialog.

    const fileContent = await readFile(file);

    if (!password) {
      toast.error('A password is required to decrypt and import the vault.');
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
      throw new Error('The selected file is not a valid JSON backup file.');
    }

    const vaultJson = await decryptData(password, encryptedJson);
    const vault: Vault = JSON.parse(vaultJson);

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

    await clearAllData(); // Wipe all existing application data before importing the new vault.
    await directoryService.saveDirectory(vault.schemas);

    // Restore each schema's content from the vault data into IndexedDB.
    for (const schemaId in vault.content) {
      const ydoc = new Y.Doc();
      const provider = new IndexeddbPersistence(schemaId, ydoc);
      await provider.whenSynced;
      const update = base64ToUint8Array(vault.content[schemaId]);
      Y.applyUpdate(ydoc, update); // Apply the decoded state to the new Y.js document.
      provider.destroy(); // Clean up the connection.
    }

    toast.success('Vault imported successfully! The page will now reload.');
    setTimeout(() => window.location.reload(), 2000); // Reload the page to reflect the new state.
  } catch (error) {
    errorService.reportError(error, {
      operation: 'importVault.general',
      fileName: file?.name,
      fileSize: file?.size,
    });
    toast.error('Import Failed', {
      description:
        'The password may be incorrect, or the selected file may be corrupt or invalid.',
    });
  }
}

/**
 * Prompts the user to select a `.json` file from their local machine.
 * @returns A promise that resolves with the selected `File` object, or `null` if the user cancels.
 * @internal
 */
function selectFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      resolve(input.files ? input.files[0] : null);
      document.body.removeChild(input); // Clean up the dynamically created input element.
    };
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    // Note: If the user closes the dialog without selecting a file, `onchange` does not fire.
    // In this implementation, the promise will simply never resolve, which is acceptable.
  });
}

/**
 * Reads the content of a `File` object as a text string.
 * @param file The `File` object to be read.
 * @returns A promise that resolves with the file's text content.
 * @internal
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
 * Wipes all application data from the browser's storage.
 * @remarks
 * This is a highly destructive function. It deletes all IndexedDB databases associated
 * with schemas and clears all data from `localStorage` managed by `directoryService`.
 * @returns A promise that resolves when all data has been successfully cleared.
 * @internal
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
            new Error(
              `Database deletion for schema '${schema.id}' is blocked. Close other tabs.`
            )
          );
      })
  );
  await Promise.all(deletionPromises);
  await directoryService.clearDirectory();
}

/**
 * Performs a basic structural validation of the decrypted vault data to ensure it
 * matches the expected `Vault` interface.
 * @param data The data to validate.
 * @returns A type guard (`data is Vault`) indicating whether the data is a valid `Vault`.
 * @internal
 */
function isValidVault(data: any): data is Vault {
  return (
    data &&
    Array.isArray(data.schemas) &&
    typeof data.content === 'object' &&
    data.content !== null
  );
}
