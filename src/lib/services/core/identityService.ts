// src/lib/services/core/identityService.ts

import type { Identity } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';

/**
 * Este servicio gestiona la identidad criptográfica del usuario, que es
 * la base para la soberanía de sus datos. La identidad se genera una vez
 * y se almacena localmente en el navegador, nunca se transmite a un servidor.
 */

const IDENTITY_STORAGE_KEY = 'schemas-work-identity';

/**
 * Obtiene la identidad criptográfica del usuario desde localStorage.
 * Si no existe, genera una nueva, la guarda y la devuelve.
 *
 * Utiliza la Web Crypto API, el estándar moderno y seguro para operaciones
 * criptográficas en el navegador.
 *
 * @returns {Promise<Identity>} Una promesa que se resuelve con la identidad del usuario.
 */
export async function getOrCreateIdentity(): Promise<Identity> {
  if (typeof window === 'undefined') {
    return { publicKey: '', privateKey: '' };
  }

  // *** 2. ENVOLVER TODA LA LÓGICA EN try...catch ***
  try {
    const storedIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY);

    if (storedIdentity) {
      try {
        return JSON.parse(storedIdentity) as Identity;
      } catch (parseError) {
        errorService.reportError(parseError, {
          operation: 'getOrCreateIdentity.parse',
          description: 'Stored identity is corrupt. Generating a new one.',
        });
        // Si el parseo falla, continuamos para generar una nueva identidad.
      }
    }

    // --- Generar una nueva identidad ---
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify']
    );

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
  } catch (error) {
    errorService.reportError(error, {
      operation: 'getOrCreateIdentity.crypto',
      description: 'Failed during cryptographic key generation or export.',
    });

    // En caso de un error criptográfico grave, devolvemos una identidad vacía
    // para evitar que la aplicación se bloquee, aunque algunas funcionalidades
    // futuras podrían no funcionar.
    return { publicKey: '', privateKey: '' };
  }
}
