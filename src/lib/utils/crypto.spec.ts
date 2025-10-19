/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptData, decryptData } from './crypto';

//
// ==== Test Constants ====
//
const MOCK_PASSWORD = 'test-password';
const MOCK_PLAINTEXT = 'This is the secret data.';

const MOCK_SALT_UINT8 = new Uint8Array(16).fill(1);
const MOCK_IV_UINT8 = new Uint8Array(12).fill(2);
const MOCK_CIPHERTEXT_UINT8 = new Uint8Array([10, 20, 30]);
const MOCK_PLAINTEXT_UINT8 = new TextEncoder().encode(MOCK_PLAINTEXT);

const MOCK_SALT_BASE64 = 'AQEBAQEBAQEBAQEBAQEBAQ==';
const MOCK_IV_BASE64 = 'AgICAgICAgICAgIC';
const MOCK_CIPHERTEXT_BASE64 = 'ChQe';

// Create realistic mock CryptoKeys to satisfy TypeScript
const MOCK_BASE_KEY: CryptoKey = {
  type: 'secret', // Correct: The resulting key object type is 'secret', not 'raw'
  extractable: false,
  algorithm: { name: 'PBKDF2' },
  usages: ['deriveKey'],
};
const MOCK_DERIVED_KEY: CryptoKey = {
  type: 'secret',
  extractable: true,
  algorithm: { name: 'AES-GCM' },
  usages: ['encrypt', 'decrypt'],
};

// Helper to convert Uint8Array to the specific "binary string" format used by btoa/atob
function toBinaryString(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}

//
// ==== Mocks for Browser APIs ====
//
beforeEach(() => {
  vi.restoreAllMocks();

  // Mock crypto.getRandomValues with a generic signature to match the original
  vi.spyOn(window.crypto, 'getRandomValues').mockImplementation(
    <T extends ArrayBufferView>(arr: T): T => {
      // We only care about Uint8Array for our tests, so we check the type
      if (arr instanceof Uint8Array) {
        if (arr.length === 16) arr.set(MOCK_SALT_UINT8);
        else if (arr.length === 12) arr.set(MOCK_IV_UINT8);
      }
      return arr;
    }
  );

  // Mock the subtle crypto operations
  vi.spyOn(window.crypto.subtle, 'importKey').mockResolvedValue(MOCK_BASE_KEY);
  vi.spyOn(window.crypto.subtle, 'deriveKey').mockResolvedValue(
    MOCK_DERIVED_KEY
  );
  vi.spyOn(window.crypto.subtle, 'encrypt').mockResolvedValue(
    MOCK_CIPHERTEXT_UINT8.buffer
  );
  vi.spyOn(window.crypto.subtle, 'decrypt').mockResolvedValue(
    MOCK_PLAINTEXT_UINT8.buffer
  );

  // Mock btoa and atob
  vi.spyOn(window, 'btoa').mockImplementation((binary: string) => {
    if (binary === toBinaryString(MOCK_SALT_UINT8)) return MOCK_SALT_BASE64;
    if (binary === toBinaryString(MOCK_IV_UINT8)) return MOCK_IV_BASE64;
    if (binary === toBinaryString(MOCK_CIPHERTEXT_UINT8))
      return MOCK_CIPHERTEXT_BASE64;
    return 'unknown_base64';
  });
  vi.spyOn(window, 'atob').mockImplementation((base64: string) => {
    if (base64 === MOCK_SALT_BASE64) return toBinaryString(MOCK_SALT_UINT8);
    if (base64 === MOCK_IV_BASE64) return toBinaryString(MOCK_IV_UINT8);
    if (base64 === MOCK_CIPHERTEXT_BASE64)
      return toBinaryString(MOCK_CIPHERTEXT_UINT8);
    throw new Error('Unexpected atob input');
  });
});

//
// ==== Tests ====
//
describe('crypto utilities', () => {
  describe('encryptData', () => {
    it('should correctly encrypt data and return base64 encoded salt, iv, and ciphertext', async () => {
      const result = await encryptData(MOCK_PASSWORD, MOCK_PLAINTEXT);

      expect(result).toEqual({
        salt: MOCK_SALT_BASE64,
        iv: MOCK_IV_BASE64,
        ciphertext: MOCK_CIPHERTEXT_BASE64,
      });
      expect(window.crypto.subtle.encrypt).toHaveBeenCalledWith(
        { name: 'AES-GCM', iv: MOCK_IV_UINT8 },
        MOCK_DERIVED_KEY,
        MOCK_PLAINTEXT_UINT8
      );
    });
  });

  describe('decryptData', () => {
    it('should correctly decrypt data and return the original plaintext', async () => {
      const encryptedMock = {
        salt: MOCK_SALT_BASE64,
        iv: MOCK_IV_BASE64,
        ciphertext: MOCK_CIPHERTEXT_BASE64,
      };
      const result = await decryptData(MOCK_PASSWORD, encryptedMock);

      expect(result).toBe(MOCK_PLAINTEXT);
      expect(window.crypto.subtle.decrypt).toHaveBeenCalledWith(
        { name: 'AES-GCM', iv: MOCK_IV_UINT8 },
        MOCK_DERIVED_KEY,
        MOCK_CIPHERTEXT_UINT8
      );
    });
  });
});
