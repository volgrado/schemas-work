// src/lib/services/core/identityService.ts

import type { Identity } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';

/**
 * This service manages the user's cryptographic identity, which is
 * the foundation for their data sovereignty. The identity is generated once
 * and stored locally in the browser, never transmitted to a server.
 */

const IDENTITY_STORAGE_KEY = 'schemas-work-identity';

/**
 * Retrieves the user's cryptographic identity from localStorage.
 * If it doesn't exist, it generates a new one, saves it, and returns it.
 *
 * It uses the Web Crypto API, the modern and secure standard for cryptographic
 * operations in the browser.
 *
 * @returns {Promise<Identity>} A promise that resolves with the user's identity.
 */
export async function getOrCreateIdentity(): Promise<Identity> {
  if (typeof window === 'undefined') {
    return { publicKey: '', privateKey: '' };
  }

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
        // If parsing fails, continue to generate a new identity.
      }
    }

    // --- Generate a new identity ---
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify'],
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey(
      'jwk',
      keyPair.publicKey,
    );
    const privateKeyJwk = await window.crypto.subtle.exportKey(
      'jwk',
      keyPair.privateKey,
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

    // In case of a serious cryptographic error, return an empty identity
    // to prevent the application from crashing, although some future
    // functionalities might not work.
    return { publicKey: '', privateKey: '' };
  }
}
