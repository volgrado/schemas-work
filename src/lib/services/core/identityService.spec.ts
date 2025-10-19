/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getOrCreateIdentity } from './identityService';
import { IDENTITY_STORAGE_KEY } from '$lib/constants';
import type { Identity } from '$lib/types';

// --- MOCK CONSTANTS ---
const MOCK_PUBLIC_JWK = { kty: 'OKP', crv: 'Ed25519', x: 'pub-key-x' };
const MOCK_PRIVATE_JWK = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'pub-key-x',
  d: 'priv-key-d',
};

const MOCK_IDENTITY: Identity = {
  publicKey: JSON.stringify(MOCK_PUBLIC_JWK),
  privateKey: JSON.stringify(MOCK_PRIVATE_JWK),
};

// --- MOCK DEPENDENCIES ---

// 1. Mock the module. This is hoisted to the top.
//    We create the mock function directly inside.
vi.mock('$lib/services/core/errorService', () => ({
  reportError: vi.fn(),
}));

// 2. Import the mocked function *after* the vi.mock call.
//    `reportError` here is now the vi.fn() we created above.
import { reportError } from '$lib/services/core/errorService';

const mockGenerateKey = vi.fn();
const mockExportKey = vi.fn();
const mockCryptoSubtle = {
  generateKey: mockGenerateKey,
  exportKey: mockExportKey,
};

describe('identityService', () => {
  beforeEach(() => {
    // Clear localStorage and mocks before each test
    localStorage.clear();
    vi.clearAllMocks(); // Clears spies/mocks like generateKey/exportKey

    // 3. Clear the history of our specific imported mock.
    (reportError as Mock).mockClear();

    // Setup the mock Web Crypto API (required by the service)
    vi.spyOn(window, 'crypto', 'get').mockReturnValue({
      // @ts-ignore - We are providing a partial mock for testing purposes
      subtle: mockCryptoSubtle,
    });

    // Default success mock for key generation
    mockGenerateKey.mockResolvedValue({
      publicKey: { type: 'public-key' },
      privateKey: { type: 'private-key' },
    });

    // Default success mock for key export
    mockExportKey.mockImplementation((format, key) => {
      if (key.type === 'public-key') return MOCK_PUBLIC_JWK;
      if (key.type === 'private-key') return MOCK_PRIVATE_JWK;
      return {};
    });
  });

  // -------------------------
  // Retrieval Path (Identity Exists)
  // -------------------------

  it('should return the existing identity if found in localStorage', async () => {
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(MOCK_IDENTITY));

    const identity = await getOrCreateIdentity();

    expect(identity).toEqual(MOCK_IDENTITY);
    // Should not try to generate a new key
    expect(mockGenerateKey).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled(); // 4. Use the imported mock directly
  });

  // -------------------------
  // Creation Path (Identity Does Not Exist)
  // -------------------------

  it('should generate, store, and return a new identity if none exists', async () => {
    // localStorage is empty by default
    const identity = await getOrCreateIdentity();

    // Verify key generation parameters
    expect(mockGenerateKey).toHaveBeenCalledWith({ name: 'Ed25519' }, true, [
      'sign',
      'verify',
    ]);

    // Verify key export and structure
    expect(mockExportKey).toHaveBeenCalledTimes(2);
    expect(identity).toEqual(MOCK_IDENTITY);

    // Verify storage
    const storedIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY);
    expect(storedIdentity).toBe(JSON.stringify(MOCK_IDENTITY));
  });

  // -------------------------
  // Error and Fallback Handling
  // -------------------------

  it('should generate a new key if the stored identity is corrupted (unparsable JSON)', async () => {
    localStorage.setItem(IDENTITY_STORAGE_KEY, '{"publicKey": "invalid-json');

    const identity = await getOrCreateIdentity();

    // Should attempt to parse, fail, report error, and generate new key
    expect(reportError).toHaveBeenCalledWith(
      expect.any(SyntaxError),
      expect.objectContaining({ operation: 'getOrCreateIdentity.parse' })
    );
    expect(mockGenerateKey).toHaveBeenCalledTimes(1);
    expect(identity).toEqual(MOCK_IDENTITY);

    // Verify corrupted key was successfully overwritten
    expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBe(
      JSON.stringify(MOCK_IDENTITY)
    );
  });

  it('should return an empty identity and report a critical error if crypto key generation fails', async () => {
    // Simulate a failure in the browser's crypto API
    const CRYPTO_ERROR = new Error('Crypto API is unavailable or blocked.');
    mockGenerateKey.mockRejectedValue(CRYPTO_ERROR);

    const identity = await getOrCreateIdentity();

    // Should return a placeholder identity to prevent crash
    expect(identity).toEqual({ publicKey: '', privateKey: '' });

    // Should report the critical failure
    expect(reportError).toHaveBeenCalledWith(
      CRYPTO_ERROR,
      expect.objectContaining({ operation: 'getOrCreateIdentity.crypto' })
    );

    // Should NOT have attempted to save anything
    expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBeNull();
  });

  it('should return an empty identity in a non-browser (SSR) environment', async () => {
    // Temporarily undefine `window` to simulate an SSR environment
    const originalWindow = global.window;
    // @ts-ignore - Intentionally modifying the global scope for this test
    delete global.window;

    const identity = await getOrCreateIdentity();

    // Verify it returns the placeholder without trying to use browser APIs
    expect(identity).toEqual({ publicKey: '', privateKey: '' });
    expect(mockGenerateKey).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();

    // Restore the window object to not affect other tests
    global.window = originalWindow;
  });
});
