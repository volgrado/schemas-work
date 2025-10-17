/**
 * @file Manages the user's unique and persistent cryptographic identity.
 *
 * @remarks
 * This service is responsible for the creation and retrieval of the user's cryptographic
 * identity. This identity is fundamental to ensuring data sovereignty and enabling future
 * security features like document signing and end-to-end encryption. The identity is
 * generated using the modern and highly secure Ed25519 algorithm via the Web Crypto API.
 *
 * The generated key pair (public and private) is stored in the standard JSON Web Key (JWK)
 * format within the browser's `localStorage`. This approach ensures that the identity is
 * persistent for the user on their specific device but is never transmitted to a remote
 * server, thereby preserving user privacy and control.
 */

import type { Identity } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';

/**
 * The key used to store the user's identity object as a JSON string in `localStorage`.
 * @internal
 */
const IDENTITY_STORAGE_KEY = 'schemas-work-identity';

/**
 * Retrieves the user's cryptographic identity from `localStorage`. If no identity
 * exists, it transparently generates a new one, stores it, and then returns it.
 *
 * @remarks
 * This function is the single entry point for accessing the user's identity. It includes
 * robust error handling to manage cases of corrupted stored data or failures in the
 * underlying cryptographic key generation process.
 *
 * The use of the standard Web Crypto API ensures that all cryptographic operations are
 * performed securely within the sandboxed environment of the browser.
 *
 * @returns A promise that resolves with the user's `Identity` object, containing the
 *          public and private keys as stringified JWKs. In the rare event of a
 *          critical, unrecoverable error during key generation, it returns an empty
 *          (but valid) identity object to prevent the application from crashing,
 *          allowing it to operate in a degraded state.
 */
export async function getOrCreateIdentity(): Promise<Identity> {
  // In a server-side rendering (SSR) context, `window` is not available. Return a
  // placeholder identity to avoid errors during server-side compilation.
  if (typeof window === 'undefined') {
    return { publicKey: '', privateKey: '' };
  }

  try {
    const storedIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY);

    if (storedIdentity) {
      try {
        // Attempt to parse the stored identity. If successful, return it.
        return JSON.parse(storedIdentity) as Identity;
      } catch (parseError) {
        // If parsing fails, the stored data is corrupt. Report the error and proceed
        // to generate a new identity, effectively overwriting the corrupt one.
        errorService.reportError(parseError, {
          operation: 'getOrCreateIdentity.parse',
          description: 'Stored identity is corrupt. A new identity will be generated.',
        });
      }
    }

    // --- Generate a new Ed25519 key pair if none exists ---
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'Ed25519' }, // A modern, fast, and secure algorithm for digital signatures.
      true, // The key must be extractable so it can be stored as a JWK.
      ['sign', 'verify'], // Defines the intended uses for the key pair.
    );

    // Export both the public and private keys into the standard JSON Web Key (JWK) format.
    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

    const newIdentity: Identity = {
      publicKey: JSON.stringify(publicKeyJwk),
      privateKey: JSON.stringify(privateKeyJwk),
    };

    // Persist the newly created identity to localStorage for future use.
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(newIdentity));

    return newIdentity;
  } catch (cryptoError) {
    // This block catches errors from the Web Crypto API itself.
    errorService.reportError(cryptoError, {
      operation: 'getOrCreateIdentity.crypto',
      description: 'A critical failure occurred during cryptographic key generation or export.',
    });

    // Return a non-null, empty identity to prevent dependent parts of the application
    // from crashing. This signals that the app is in a degraded but stable state.
    return { publicKey: '', privateKey: '' };
  }
}
