/**
 * @file languageStore.svelte.ts
 * @store
 * @description
 * Manages the "Native" (L1) and "Target" (L2) language configuration for the user.
 * This state is critical for the Plurilingual Strategy features of the Pedagogy Service.
 */

class LanguageStore {
  /**
   * The user's native language (L1).
   * Used for "Intercomprehension" strategies and interface localization.
   */
  l1 = $state<string>('Spanish'); // Default as per requirements

  /**
   * The user's target language (L2).
   * Used for curriculum generation and immersion.
   */
  l2 = $state<string>('Greek');   // Default as per requirements

  /**
   * Updates the language configuration.
   */
  setLanguages(native: string, target: string) {
    this.l1 = native;
    this.l2 = target;
  }
}

export const languageState = new LanguageStore();
