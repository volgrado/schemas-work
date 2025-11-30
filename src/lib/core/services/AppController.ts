/**
 * @file AppController.ts
 * @description
 * The central brain for application bootstrapping and lifecycle management.
 */

import { browser } from '$app/environment';
import { initializeIcons } from '$lib/core/services/iconService';
import { initialize as initializeTts } from '$lib/modules/tts/ui/ttsStore.svelte';
import { WebSpeechTTSService } from '$lib/modules/tts/infra/webSpeechTTSService';
import { initializeReviewStoreListeners } from '$lib/modules/study/ui/reviewStore.svelte';
import { initializeDocumentStoreListeners } from '$lib/modules/editor/ui/documentStore.svelte';
import { i18n } from '$lib/utils/i18n.svelte';
import {
  setView,
  openDiagnosticModal,
  openApiKeyModal,
} from '$lib/modules/command-bar/ui/commandBarStore.svelte';
import { actionRegistry } from '$lib/actions/registry';

export class AppController {
  private static isInitialized = false;

  /**
   * The single entry point for booting up the application.
   * Should be called once from the root component's onMount.
   */
  static async initialize() {
    if (this.isInitialized || !browser) return;

    console.log('🚀 AppController: Bootstrapping application...');

    // 1. Core State & Listeners
    this.initializeStores();

    // 2. UI & Theme
    // Theme is often needed immediately to prevent flash of unstyled content
    // (though _applyThemeToDOM is usually fast enough).

    // 3. Services
    initializeIcons();
    initializeTts(new WebSpeechTTSService());

    // 4. Global Actions
    this.registerGlobalActions();

    // 5. Global Event Listeners
    this.setupAudioUnlockListener();

    this.isInitialized = true;
    console.log('✅ AppController: Initialization complete.');
  }

  private static initializeStores() {
    initializeReviewStoreListeners();
    initializeDocumentStoreListeners();
  }

  /**
   * Registers all primary Command Bar actions.
   * Formerly in `init.ts`.
   */
  static registerGlobalActions() {
    const t = i18n.t;

    const actions = [
      // --- Navigation & Core Views ---
      {
        id: 'app.newSchema',
        title: t('command.new_schema'),
        description: t('command.new_schema'),
        icon: 'plus',
        context: 'view:command-bar',
        handler: async () => {
          const { create } = await import(
            '$lib/modules/editor/ui/documentStore.svelte'
          );

          const defaultName = t('file_explorer.default_schema_name');
          await create(defaultName);
          close();
        },
      },
      {
        id: 'app.switchSchema',
        title: t('command.explore_schemas'),
        description: t('command.explore_schemas'),
        icon: 'folder',
        context: 'view:command-bar',
        handler: () => setView('file-explorer'),
      },
      {
        id: 'app.studyDecks',
        title: t('command.study_decks'),
        description: t('command.study_decks'),
        icon: 'book-open',
        context: 'view:command-bar',
        handler: () => setView('study-hub'),
      },
      {
        id: 'app.aiSubmenu',
        title: t('command.ai_assistant'),
        description: t('command.ai_assistant'),
        icon: 'sparkles',
        context: 'view:command-bar',
        handler: () => setView('ai-actions'),
      },
      {
        id: 'app.vaultManagement',
        title: t('command.vault_management'),
        description: t('command.vault_management'),
        icon: 'lock',
        context: 'view:command-bar',
        handler: () => setView('vault'),
      },
      {
        id: 'app.startImmersive',
        title: 'Start Immersive Learning',
        description: 'Enter the 3D Language Learning Mode',
        icon: 'graduation-cap',
        context: 'view:command-bar',
        handler: async () => {
          console.log('🎓 Command Triggered: Start Immersive Learning');
          try {
            const { goto } = await import('$app/navigation');
            const { close } = await import('$lib/modules/command-bar/ui/commandBarStore.svelte');
            console.log('🔄 Navigating to immersive route...');
            goto('/language');
            close();
          } catch (e) {
            console.error('❌ Failed to start immersive mode:', e);
          }
        },
      },

      // --- Features & Utilities ---
      {
        id: 'app.readAloud',
        title: t('command.read_schema'),
        description: t('command.read_schema'),
        icon: 'volume-2',
        context: 'view:command-bar',
        handler: async () => {
          const { editorState } = await import(
            '$lib/modules/editor/ui/editorStore.svelte'
          );
          const { startReading } = await import(
            '$lib/modules/tts/ui/ttsStore.svelte'
          );
          const { getReadableNodes } = await import(
            '$lib/modules/tts/infra/ttsUtils'
          );
          const { toast } = await import('svelte-sonner');
          const { close } = await import(
            '$lib/modules/command-bar/ui/commandBarStore.svelte'
          );

          const editor = editorState.instance;
          if (editor) {
            editor.chain().focus().ensureNodeIds().run();
            const nodesToRead = getReadableNodes(editor);
            startReading(nodesToRead);
            close();
          } else {
            toast.error(t('common.editor_not_ready'));
          }
        },
      },
      {
        id: 'app.openDiagnosticModal',
        title: t('command.diagnostics_and_error_report'),
        description: t('command.diagnostics_and_error_report'),
        icon: 'activity',
        context: 'view:command-bar',
        handler: () => openDiagnosticModal(),
      },
      {
        id: 'app.openApiKeyModal',
        title: t('command.set_api_key'),
        description: t('command.set_api_key'),
        icon: 'key',
        context: 'view:command-bar',
        handler: () => openApiKeyModal(),
      },
    ];

    // Batch register
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions.forEach((action) => actionRegistry.register(action as any));
  }

  /**
   * Mobile browsers (especially iOS Safari) require a user gesture to unlock
   * the AudioContext and SpeechSynthesis API.
   */
  private static setupAudioUnlockListener() {
    const unlockAudioContext = () => {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const context = new AudioContext();
        if (context.state === 'suspended') context.resume();
      }
      // Playing an empty utterance unlocks the speech synthesis queue.
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    };

    window.addEventListener('click', unlockAudioContext, { once: true });
    window.addEventListener('touchstart', unlockAudioContext, { once: true });
  }
}
