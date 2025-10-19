/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import type { SchemaMetadata, Vault } from '$lib/types';

// --- MOCK ALL DEPENDENCIES AT THE TOP ---
vi.mock('$lib/services/core/directoryService');
vi.mock('$lib/utils/crypto');
vi.mock('$lib/services/core/errorService');
vi.mock('svelte-sonner');
vi.mock('yjs');
vi.mock('y-indexeddb');

import { exportVault, importVault } from './backupService';
import * as directoryService from '$lib/services/core/directoryService';
import * as cryptoUtils from '$lib/utils/crypto';
import * as errorService from '$lib/services/core/errorService';
import { toast } from 'svelte-sonner';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

describe('backupService', () => {
  // --- MOCK DATA ---
  const MOCK_PASSWORD = 'strong-password';
  const MOCK_DATE_ISO = '2023-01-01T00:00:00.000Z';
  const mockSchemas: SchemaMetadata[] = [
    {
      id: 'doc-1',
      title: 'Doc A',
      type: 'schema',
      createdAt: 0,
      updatedAt: 0,
      parentId: null,
    },
    {
      id: 'fold-1',
      title: 'Folder 1',
      type: 'folder',
      createdAt: 0,
      updatedAt: 0,
      parentId: null,
    },
  ];
  const mockVault: Vault = {
    schemas: mockSchemas,
    content: { 'doc-1': 'encoded-content' },
  };

  // --- MOCK BROWSER APIs ---
  const mockAnchor = {
    href: '',
    download: '',
    click: vi.fn(),
    style: {},
  } as any;
  const mockReload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(MOCK_DATE_ISO));

    // Stub global browser APIs
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockAnchor),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test-url'),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('window', {
      location: { reload: mockReload },
      indexedDB: {
        deleteDatabase: vi.fn().mockImplementation(() => {
          const req = {
            onsuccess: () => {},
            onerror: () => {},
            onblocked: () => {},
          };
          setTimeout(() => req.onsuccess(), 0);
          return req;
        }),
      },
    });
    vi.stubGlobal('Blob', vi.fn());

    // Setup default happy path mocks for dependencies
    (directoryService.getAllItems as Mock).mockResolvedValue(mockSchemas);
    (cryptoUtils.encryptData as Mock).mockResolvedValue({
      salt: 's',
      iv: 'i',
      data: 'c',
    });
    (cryptoUtils.decryptData as Mock).mockResolvedValue(
      JSON.stringify(mockVault)
    );
    (cryptoUtils.uint8ArrayToBase64 as Mock).mockReturnValue('encoded-content');
    (cryptoUtils.base64ToUint8Array as Mock).mockReturnValue(
      new Uint8Array([1, 2, 3])
    );
    (Y.encodeStateAsUpdate as Mock).mockReturnValue(new Uint8Array([1, 2, 3]));
    (IndexeddbPersistence as any as Mock).mockImplementation(() => ({
      whenSynced: Promise.resolve(),
      destroy: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // -------------------------
  // 1. exportVault
  // -------------------------
  describe('exportVault', () => {
    it('should throw error if password is empty', async () => {
      await expect(exportVault('')).rejects.toThrow('A password is required');
    });

    it('should correctly orchestrate the export process', async () => {
      await exportVault(MOCK_PASSWORD);
      expect(directoryService.getAllItems).toHaveBeenCalledOnce();
      expect(cryptoUtils.encryptData).toHaveBeenCalledWith(
        MOCK_PASSWORD,
        JSON.stringify(mockVault)
      );
      expect(mockAnchor.download).toBe('schemas-work-backup-2023-01-01.json');
      expect(mockAnchor.click).toHaveBeenCalledOnce();
      expect(toast.success).toHaveBeenCalledWith(
        'Vault exported successfully.'
      );
    });
  });

  // -------------------------
  // 2. importVault
  // -------------------------
  describe('importVault', () => {
    const mockFileContent = '{"data":"cipher"}';
    const mockFile = new File([mockFileContent], 'backup.json');

    // FIX: Refer to the mock object directly instead of using `this`.
    // We declare the object first, so it's in scope for the function definitions.
    const mockFileReader = {
      result: mockFileContent,
      readAsText: vi.fn(() => mockFileReader.onload()), // Use arrow function and direct reference
      onload: () => {},
    };

    const mockInput = {
      ...mockAnchor,
      files: [mockFile],
      onchange: () => {},
      click: vi.fn(() => mockInput.onchange()), // Use arrow function and direct reference
    };

    beforeEach(() => {
      // Set up the mocks for the import process specifically
      (document.createElement as Mock).mockReturnValue(mockInput);
      vi.stubGlobal(
        'FileReader',
        vi.fn(() => mockFileReader)
      );
    });

    it('should successfully orchestrate the import process', async () => {
      const importPromise = importVault(MOCK_PASSWORD);
      await vi.runAllTimersAsync(); // Allow promises inside importVault to resolve
      await importPromise;

      // 1. Decryption and validation
      expect(cryptoUtils.decryptData).toHaveBeenCalledWith(MOCK_PASSWORD, {
        data: 'cipher',
      });

      // 2. Data wipe
      expect(directoryService.getAllItems).toHaveBeenCalledOnce();
      expect(window.indexedDB.deleteDatabase).toHaveBeenCalledWith('doc-1');
      expect(directoryService.clearDirectory).toHaveBeenCalledOnce();

      // 3. Data restoration
      expect(directoryService.saveDirectory).toHaveBeenCalledWith(mockSchemas);
      expect(Y.applyUpdate).toHaveBeenCalledTimes(1);

      // 4. Finalization
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Vault imported successfully')
      );
      vi.advanceTimersByTime(2000);
      expect(mockReload).toHaveBeenCalledOnce();
    });

    it('should fail gracefully if decryption fails', async () => {
      (cryptoUtils.decryptData as Mock).mockRejectedValue(
        new Error('Wrong Password')
      );

      await importVault(MOCK_PASSWORD);
      await vi.runAllTimersAsync();

      expect(errorService.reportError).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
      expect(directoryService.clearDirectory).not.toHaveBeenCalled();
      expect(mockReload).not.toHaveBeenCalled();
    });
  });
});
