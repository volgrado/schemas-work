// src/lib/utils/crypto.ts

/**
 * This module encapsulates cryptographic operations using the native
 * Web Crypto API of the browser. It provides high-level functions
 * to securely encrypt and decrypt data with a password.
 */

/**
 * Derives a robust encryption key from a password and a "salt"
 * using the PBKDF2 algorithm. This process, known as "key stretching,"
 * makes passwords much more resistant to brute-force attacks.
 *
 * @private
 * @param {string} password - The user's password.
 * @param {Uint8Array} salt - Unique random data for this encryption.
 * @returns {Promise<CryptoKey>} The derived key, ready to be used with AES-GCM.
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // 1. Import the password as a "raw" base key.
  //    PBKDF2 needs a CryptoKey as input to start deriving.
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false, // `extractable` is false because we don't need to export this intermediate key.
    ['deriveKey'], // The only allowed use is for deriving other keys.
  );

  // 2. Derive the final key.
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // A cast to `BufferSource` is made to satisfy the strict typing
      // of the API, although `Uint8Array` is functionally compatible.
      salt: salt as BufferSource,
      // A standard number of iterations (100,000+) for a good balance
      // between security and performance on modern devices.
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    // The target algorithm for the derived key. AES-GCM is the modern
    // standard for symmetric authenticated encryption.
    { name: 'AES-GCM', length: 256 },
    true, // The final derived key is `extractable` (although we don't do it here).
    ['encrypt', 'decrypt'], // The allowed uses for the final key.
  );
}

/**
 * Encrypts a data string using a password.
 *
 * @param {string} password - The password to encrypt with.
 * @param {string} data - The data string to encrypt (e.g., a stringified JSON).
 * @returns {Promise<{ salt: string; iv: string; ciphertext: string }>} An object containing the ciphertext, salt, and IV, all in Base64 format.
 */
export async function encryptData(
  password: string,
  data: string,
): Promise<{ salt: string; iv: string; ciphertext: string }> {
  // We generate cryptographically random data for the salt and the initialization vector (IV).
  // It is crucial that these are unique for each encryption operation.
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte (96-bit) IV is standard for AES-GCM.

  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(data), // The data to be encrypted must be an ArrayBuffer.
  );

  // We package and encode all the necessary components for decryption.
  // The salt, IV, and ciphertext must be stored together.
  return {
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedContent)),
  };
}

/**
 * Decrypts data using a password.
 *
 * @param {string} password - The password to decrypt with.
 * @param {{ salt: string; iv: string; ciphertext: string }} encrypted - The encrypted data object.
 * @returns {Promise<string>} The original data as a string.
 * @throws {Error} If the password is incorrect or the data is corrupted (decryption fails).
 */
export async function decryptData(
  password: string,
  encrypted: { salt: string; iv: string; ciphertext: string },
): Promise<string> {
  // 1. Decode all Base64 components back to binary.
  const salt = base64ToUint8Array(encrypted.salt);
  const iv = base64ToUint8Array(encrypted.iv);
  const ciphertext = base64ToUint8Array(encrypted.ciphertext);

  // 2. Derive the key in exactly the same way as in encryption.
  //    Using the same password and the same salt will result in the same key.
  const key = await deriveKey(password, salt);

  // 3. Attempt to decrypt. The AES-GCM `decrypt` API will throw an exception
  //    if the key is incorrect or if the data has been tampered with (authentication failure).
  //    This `try...catch` is handled in the `backupService`.
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}

// --- Encoding Helpers ---

/**
 * Converts a Uint8Array (binary data) to a Base64 string.
 * @private
 * @param {Uint8Array} data - The binary data to convert.
 * @returns {string} The Base64 encoded string.
 */
export function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  // We iterate over the buffer byte by byte.
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  // `btoa` (binary-to-ASCII) performs the Base64 encoding.
  return window.btoa(binary);
}

/**
 * Converts a Base64 string back to a Uint8Array.
 * @private
 * @param {string} base64 - The Base64 string to convert.
 * @returns {Uint8Array} The decoded binary data.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // `atob` (ASCII-to-binary) decodes the Base64 string.
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  // We convert the decoded string back into bytes.
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
