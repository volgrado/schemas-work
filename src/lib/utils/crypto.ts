// src/lib/utils/crypto.ts

/**
 * Este módulo encapsula las operaciones criptográficas utilizando la
 * Web Crypto API nativa del navegador. Proporciona funciones de alto nivel
 * para encriptar y desencriptar datos de forma segura con una contraseña.
 */

/**
 * Deriva una clave de encriptación robusta a partir de una contraseña y una "sal"
 * usando el algoritmo PBKDF2. Este proceso, conocido como "key stretching",
 * hace que las contraseñas sean mucho más resistentes a ataques de fuerza bruta.
 *
 * @private
 * @param {string} password - La contraseña del usuario.
 * @param {Uint8Array} salt - Datos aleatorios únicos para esta encriptación.
 * @returns {Promise<CryptoKey>} La clave derivada, lista para ser usada con AES-GCM.
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // 1. Importar la contraseña como una clave base "en bruto".
  //    PBKDF2 necesita una CryptoKey como entrada para empezar a derivar.
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false, // `extractable` es falso porque no necesitamos exportar esta clave intermedia.
    ['deriveKey'] // El único uso permitido es para derivar otras claves.
  );

  // 2. Derivar la clave final.
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // Se realiza un cast a `BufferSource` para satisfacer el estricto tipado
      // de la API, aunque `Uint8Array` es funcionalmente compatible.
      salt: salt as BufferSource,
      // Un número estándar de iteraciones (100,000+) para un buen balance
      // entre seguridad y rendimiento en dispositivos modernos.
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    // El algoritmo de destino para la clave derivada. AES-GCM es el estándar
    // moderno para cifrado autenticado simétrico.
    { name: 'AES-GCM', length: 256 },
    true, // La clave derivada final es `extractable` (aunque no lo hacemos aquí).
    ['encrypt', 'decrypt'] // Los usos permitidos para la clave final.
  );
}

/**
 * Encripta un string de datos usando una contraseña.
 *
 * @param {string} password - La contraseña para encriptar.
 * @param {string} data - El string de datos a encriptar (ej. un JSON stringified).
 * @returns Un objeto que contiene el texto cifrado, la sal y el IV, todos en formato Base64.
 */
export async function encryptData(
  password: string,
  data: string
): Promise<{ salt: string; iv: string; ciphertext: string }> {
  // Generamos datos criptográficamente aleatorios para la sal y el vector de inicialización (IV).
  // Es crucial que estos sean únicos para cada operación de encriptación.
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // IV de 12 bytes (96 bits) es estándar para AES-GCM.

  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(data) // Los datos a encriptar deben ser un ArrayBuffer.
  );

  // Empaquetamos y codificamos todos los componentes necesarios para la desencriptación.
  // La sal, el IV y el texto cifrado deben ser almacenados juntos.
  return {
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedContent)),
  };
}

/**
 * Desencripta datos usando una contraseña.
 *
 * @param {string} password - La contraseña para desencriptar.
 * @param {{ salt: string; iv: string; ciphertext: string }} encrypted - El objeto de datos encriptados.
 * @returns {Promise<string>} Los datos originales en formato string.
 * @throws {Error} Si la contraseña es incorrecta o los datos están corruptos (la desencriptación falla).
 */
export async function decryptData(
  password: string,
  encrypted: { salt: string; iv: string; ciphertext: string }
): Promise<string> {
  // 1. Decodificar todos los componentes de Base64 de vuelta a binario.
  const salt = base64ToUint8Array(encrypted.salt);
  const iv = base64ToUint8Array(encrypted.iv);
  const ciphertext = base64ToUint8Array(encrypted.ciphertext);

  // 2. Derivar la clave exactamente de la misma manera que en la encriptación.
  //    Usar la misma contraseña y la misma sal resultará en la misma clave.
  const key = await deriveKey(password, salt);

  // 3. Intentar desencriptar. La API `decrypt` de AES-GCM lanzará una excepción
  //    si la clave es incorrecta o si los datos han sido manipulados (fallo de autenticación).
  //    Este `try...catch` se maneja en el `backupService`.
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}

// --- Helpers de Codificación ---

/**
 * Convierte un Uint8Array (datos binarios) a una cadena Base64.
 * @private
 */
export function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  // Iteramos sobre el buffer byte a byte.
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  // `btoa` (binary-to-ASCII) realiza la codificación Base64.
  return window.btoa(binary);
}

/**
 * Convierte una cadena Base64 de vuelta a un Uint8Array.
 * @private
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // `atob` (ASCII-to-binary) decodifica la cadena Base64.
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  // Convertimos la cadena decodificada de nuevo en bytes.
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
