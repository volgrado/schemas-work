import type { Identity } from '$lib/types';

const IDENTITY_STORAGE_KEY = 'schemas-work-identity';

/**
 * Obtiene la identidad criptográfica del usuario desde localStorage.
 * Si no existe, genera una nueva, la guarda y la devuelve.
 * Esta función es la base de la soberanía de datos del usuario.
 */
export async function getOrCreateIdentity(): Promise<Identity> {
  // Comprobamos si estamos en el navegador, ya que localStorage no existe en el servidor.
  if (typeof window === 'undefined') {
    // Devolvemos una identidad nula o mock durante el Server-Side Rendering (SSR).
    return { publicKey: '', privateKey: '' };
  }

  const storedIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY);

  if (storedIdentity) {
    try {
      return JSON.parse(storedIdentity) as Identity;
    } catch (error) {
      console.error('Error al parsear la identidad almacenada:', error);
      // Si hay un error, procedemos a crear una nueva identidad.
    }
  }

  // No se encontró una identidad válida, así que generamos una nueva.
  // Usamos la Web Crypto API, que es el estándar moderno y seguro.
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'Ed25519', // Un algoritmo de firma digital moderno y eficiente.
    },
    true, // `extractable` debe ser true para poder exportar la clave.
    ['sign', 'verify']
  );

  // Exportamos las claves en formato JWK (JSON Web Key) para poder almacenarlas como texto.
  const publicKeyJwk = await window.crypto.subtle.exportKey(
    'jwk',
    keyPair.publicKey
  );
  const privateKeyJwk = await window.crypto.subtle.exportKey(
    'jwk',
    keyPair.privateKey
  );

  const newIdentity: Identity = {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
  };

  localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(newIdentity));

  return newIdentity;
}
