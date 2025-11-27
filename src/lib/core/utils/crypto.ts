/**
 * @file Encapsulates all cryptographic operations using the native Web Crypto API.
 * @module crypto
 */

/**
 * Derives a robust 256-bit encryption key from a user-provided password and a salt using the PBKDF2 algorithm.
 * @internal
 * @param password The user's password.
 * @param salt A unique, cryptographically random value.
 * @returns The derived CryptoKey.
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a data string using a password.
 * @param password The password to use for encryption.
 * @param data The plaintext data string to encrypt.
 * @returns An object containing the salt, initialization vector (IV), and ciphertext, all encoded as Base64 strings.
 */
export async function encryptData(
  password: string,
  data: string
): Promise<{ salt: string; iv: string; ciphertext: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(data)
  );

  return {
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedContent)),
  };
}

/**
 * Decrypts data using a password and the corresponding encrypted object.
 * @param password The password that was used for encryption.
 * @param encrypted The encrypted data object.
 * @returns The original plaintext data as a string.
 */
export async function decryptData(
  password: string,
  encrypted: { salt: string; iv: string; ciphertext: string }
): Promise<string> {
  const salt = base64ToUint8Array(encrypted.salt);
  const iv = base64ToUint8Array(encrypted.iv);
  const ciphertext = base64ToUint8Array(encrypted.ciphertext);

  const key = await deriveKey(password, salt);

  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}

// --- Encoding Helpers ---

/**
 * Converts a Uint8Array to a Base64 string.
 * @internal
 * @param data The binary data to convert.
 * @returns The Base64 encoded string.
 */
export function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts a Base64 string back into its original Uint8Array binary representation.
 * @internal
 * @param base64 The Base64 string to convert.
 * @returns The decoded binary data as a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
