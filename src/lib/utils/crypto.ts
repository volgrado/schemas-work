/**
 * @file This module encapsulates all cryptographic operations using the native Web Crypto API
 * available in modern browsers. It provides high-level, easy-to-use functions to securely
 * encrypt and decrypt data with a password, abstracting away the underlying complexity.
 * @remarks The primary use case is for encrypting user vault backups, ensuring that sensitive
 * data can be securely exported and stored. It uses the robust AES-GCM authenticated
 * encryption standard, which not only encrypts the data but also ensures its integrity
 * and authenticity.
 */

/**
 * Derives a robust 256-bit encryption key from a user-provided password and a salt
 * using the PBKDF2 algorithm. This process, known as key stretching, significantly
 * increases the cost of brute-force attacks by requiring many thousands of hash iterations.
 *
 * @internal
 * @param password - The user's password.
 * @param salt - A unique, cryptographically random value for this specific derivation.
 * @returns The derived CryptoKey, ready to be used with the AES-GCM algorithm.
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // 1. Import the password string into a base CryptoKey that PBKDF2 can use.
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false, // `extractable` is false as this base key is intermediate and not needed elsewhere.
    ['deriveKey'], // The only permitted use is to derive other keys.
  );

  // 2. Derive the final AES-GCM key from the base key.
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource, // The salt must be unique per password.
      // 100,000 iterations is a standard, recommended minimum for a good balance
      // between security and performance on modern devices.
      iterations: 100000,
      hash: 'SHA-256', // The hash function to use within the key stretching process.
    },
    baseKey,
    // The target algorithm details for the final derived key.
    // AES-GCM is the modern standard for symmetric authenticated encryption.
    { name: 'AES-GCM', length: 256 },
    true, // The final key can be exported if needed (though we don't use this).
    ['encrypt', 'decrypt'], // This key will be used for both encrypting and decrypting data.
  );
}

/**
 * Encrypts a data string using a password, returning all the necessary components for later decryption.
 *
 * @param password - The password to use for encryption.
 * @param data - The plaintext data string to encrypt (e.g., a stringified JSON object).
 * @returns A promise that resolves to an object containing the salt, initialization vector (IV),
 * and ciphertext, all encoded as Base64 strings for easy storage and transmission.
 */
export async function encryptData(
  password: string,
  data: string,
): Promise<{ salt: string; iv: string; ciphertext: string }> {
  // A cryptographically random salt and initialization vector (IV) must be generated for each encryption.
  // They are not secret but must be unique to ensure the same plaintext encrypts to different ciphertexts.
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit (12-byte) IV is the recommended size for AES-GCM.

  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(data), // The data to be encrypted must be converted to an ArrayBuffer.
  );

  // We package and encode all necessary components for decryption into Base64 strings.
  // The salt, IV, and ciphertext must all be stored together to allow for decryption.
  return {
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedContent)),
  };
}

/**
 * Decrypts data using a password and the corresponding encrypted object.
 *
 * @param password - The password that was used for encryption.
 * @param encrypted - The encrypted data object, containing the Base64-encoded salt, IV, and ciphertext.
 * @returns A promise that resolves to the original plaintext data as a string.
 * @throws Will throw an error if the password is incorrect or if the ciphertext has been tampered with.
 * This is because AES-GCM decryption will fail if the authentication tag is invalid.
 */
export async function decryptData(
  password: string,
  encrypted: { salt: string; iv: string; ciphertext: string },
): Promise<string> {
  // 1. Decode all Base64-encoded components back into their binary Uint8Array representations.
  const salt = base64ToUint8Array(encrypted.salt);
  const iv = base64ToUint8Array(encrypted.iv);
  const ciphertext = base64ToUint8Array(encrypted.ciphertext);

  // 2. Re-derive the encryption key using the exact same password and salt.
  // Any mismatch will result in a different key, causing decryption to fail.
  const key = await deriveKey(password, salt);

  // 3. Attempt to decrypt the data. The Web Crypto API's `decrypt` for AES-GCM will automatically
  //    verify the authenticity of the data. If the key is wrong or the data corrupted, it throws an exception.
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );

  // 4. Decode the resulting ArrayBuffer back into a human-readable string.
  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}

// --- Encoding Helpers ---

/**
 * Converts a Uint8Array (binary data) to a Base64 string for safe text-based transmission or storage.
 * @internal
 * @param data - The binary data to convert.
 * @returns The Base64 encoded string.
 */
export function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  // The `btoa` function in browsers expects a binary string, not a byte array.
  // This loop converts the bytes into a string of characters representing those bytes.
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  // `btoa` (binary-to-ASCII) performs the final Base64 encoding.
  return window.btoa(binary);
}

/**
 * Converts a Base64 string back into its original Uint8Array binary representation.
 * @internal
 * @param base64 - The Base64 string to convert.
 * @returns The decoded binary data as a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // `atob` (ASCII-to-binary) decodes the Base64 string into a binary string.
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  // This loop converts the binary string back into an array of byte values.
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
