/**
 * @file Manages the state and operations for Text-to-Speech (TTS) playback.
 * This store orchestrates the TTS service, offline downloads, and UI state, including
 * the Media Session API for native OS media controls.
 * @module ttsStore
 */

import { writable, get } from 'svelte/store';
import { editorStore } from './editorStore';
import { documentStore } from './documentStore';
import { offlineStore } from './offlineStore';
import {
  mediaSessionService,
  type MediaMetadataPayload,
} from '$lib/services/tts/mediaSessionService';
import { EdgeAudioTTSService } from '$lib/services/tts/EdgeAudioTTSService';
import type { TTSVoice } from '$lib/services/tts/ttsService';
import { getReadableNodes, type ReadableNode } from '$lib/utils/ttsUtils';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { toast } from 'svelte-sonner';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';
import { t } from '$lib/utils/i18n';

// --- Types and Initial State ---
export type TTSStatus =
  | 'idle'
  | 'initializing'
  | 'awaiting_download'
  | 'playing'
  | 'paused'
  | 'error';

export interface TTSState {
  status: TTSStatus;
  nodesToRead: ReadableNode[];
  currentNodeIndex: number;
  decorationSet: DecorationSet;
  availableVoices: TTSVoice[];
  selectedVoiceId: string | null;
  rate: number;
  pitch: number;
  error: string | null;
  isServiceReady: boolean;
  currentSpeechId: string | null;
}

const initialState: TTSState = {
  status: 'idle',
  nodesToRead: [],
  currentNodeIndex: 0,
  decorationSet: DecorationSet.empty,
  availableVoices: [],
  selectedVoiceId: null,
  rate: 1,
  pitch: 1,
  error: null,
  isServiceReady: false,
  currentSpeechId: null,
};

/**
 * Creates the TTS store with all its associated logic and side-effects.
 * This factory pattern encapsulates the complex state management.
 */
function createTtsStore() {
  const store = writable<TTSState>(initialState);
  const { subscribe, update, set } = store;

  let ttsService: EdgeAudioTTSService | null = null;
  let editorUnsubscriber: (() => void) | null = null;

  // --- Private Helpers ---

  /** Sets up the integration with the Media Session API, making the store self-contained. */
  function setupMediaSessionIntegration() {
    mediaSessionService.initialize({
      onPlay: () => publicMethods.resumeReading(),
      onPause: () => publicMethods.pauseReading(),
      onNextTrack: () => publicMethods.nextNode(),
      onPreviousTrack: () => publicMethods.previousNode(),
    });

    // Subscribe to our own store's changes to keep the media notification in sync.
    store.subscribe(($tts) => {
      const status = $tts.status;
      if (status === 'playing' || status === 'paused') {
        const $document = get(documentStore);
        const currentNode = $tts.nodesToRead[$tts.currentNodeIndex];

        if (currentNode) {
          const metadata: MediaMetadataPayload = {
            title: currentNode.title,
            artist: $document.metadata?.title || 'Document',
            album: 'Schemas.Work',
            artwork: [
              {
                src: '/android-chrome-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: '/android-chrome-512x512.png',
                sizes: '512x512',
                type: 'image/png',
              },
            ],
          };
          mediaSessionService.updateMetadata(metadata);
        }
        mediaSessionService.setPlaybackState(status);
      } else {
        mediaSessionService.clear();
      }
    });
  }

  /** Centralizes the logic for stopping playback and cleaning up state. */
  function transitionToIdle(resetCompletely: boolean = false) {
    ttsService?.cancel();
    document.body.classList.remove('is-reading-aloud');

    // Note: mediaSessionService.clear() is handled automatically by the subscription
    // when the status changes to 'idle'.

    if (resetCompletely) {
      set(initialState);
      if (ttsService) {
        const service = ttsService; // Capture in a const for safety
        set({
          ...initialState,
          isServiceReady: true,
          availableVoices: service.getVoices(),
        });
      } else {
        set(initialState);
      }
    } else {
      update((s) => ({
        ...s,
        status: 'idle',
        decorationSet: DecorationSet.empty,
        currentSpeechId: null,
      }));
    }
  }

  /** Updates the visual highlight on the currently spoken node. */
  function highlightCurrentNode() {
    const { instance: editor } = get(editorStore);
    const { nodesToRead, currentNodeIndex } = get(store);
    if (!editor || nodesToRead.length === 0) return;

    const currentNode = nodesToRead[currentNodeIndex];
    if (!currentNode) return;

    const deco = Decoration.node(
      currentNode.pos,
      currentNode.pos + currentNode.node.nodeSize,
      { class: 'is-current-tts-node' }
    );
    update((s) => ({
      ...s,
      decorationSet: DecorationSet.create(editor.state.doc, [deco]),
    }));
  }

  /** The core function to speak a single node. */
  async function speakNodeAtIndex(index: number) {
    const { nodesToRead, selectedVoiceId, rate, pitch } = get(store);

    if (index < 0 || index >= nodesToRead.length) {
      toast.success(get(t)('tts.finished_reading_toast'));
      transitionToIdle(true);
      return;
    }

    if (!ttsService || !selectedVoiceId) {
      errorService.reportError(
        new Error(
          'speakNodeAtIndex called without ready service or selected voice'
        )
      );
      return;
    }

    const nodeToRead = nodesToRead[index];
    const speechId = uuidv4();
    const docId = get(documentStore).docId;
    const audioId = docId ? `${docId}_${index}` : undefined;

    update((s) => ({
      ...s,
      currentNodeIndex: index,
      status: 'playing',
      currentSpeechId: speechId,
    }));
    highlightCurrentNode();

    // Note: mediaSessionService state is updated automatically by the subscription.

    try {
      await ttsService.speak(nodeToRead.textToSpeak, {
        voiceId: selectedVoiceId,
        rate,
        pitch,
        audioId,
        onEnd: () => {
          if (get(store).currentSpeechId === speechId) publicMethods.nextNode();
        },
        onError: (error) => {
          if (get(store).currentSpeechId === speechId) {
            errorService.reportError(error, { operation: 'tts.speakNode' });
            update((s) => ({
              ...s,
              status: 'error',
              error: get(t)('tts.playback_error'),
            }));
          }
        },
      });
    } catch (initialError) {
      errorService.reportError(initialError as Error, {
        operation: 'tts.speakNode.setup',
      });
      update((s) => ({
        ...s,
        status: 'error',
        error: get(t)('tts.playback_error'),
      }));
    }
  }

  /** Attaches a listener to the editor to stop playback on content changes. */
  function setupEditorListener() {
    editorUnsubscriber?.();
    const { instance: editor } = get(editorStore);
    if (!editor) return;

    let previousDoc: ProseMirrorNode = editor.state.doc;
    const handleTransaction = () => {
      const { status } = get(store);
      if (['awaiting_download', 'playing', 'paused'].includes(status)) {
        if (!editor.state.doc.eq(previousDoc)) {
          toast.info(get(t)('tts.stopped_due_to_changes_toast'));
          transitionToIdle(true);
        }
      }
      previousDoc = editor.state.doc;
    };

    editor.on('transaction', handleTransaction);
    editorUnsubscriber = () => editor.off('transaction', handleTransaction);
  }

  // --- Public Store Methods ---
  const publicMethods = {
    subscribe,

    async initialize(audioEl: HTMLAudioElement): Promise<void> {
      if (ttsService) return;
      update((s) => ({ ...s, status: 'initializing' }));
      try {
        ttsService = new EdgeAudioTTSService(audioEl);
        await ttsService.initialize();

        const voices = ttsService.getVoices();
        const preferredVoice =
          voices.find((v) => v.id === 'en-US-JennyNeural') || voices[0];

        update((s) => ({
          ...s,
          status: 'idle',
          isServiceReady: true,
          availableVoices: voices,
          selectedVoiceId: preferredVoice?.id ?? null,
        }));

        setupEditorListener();
        setupMediaSessionIntegration();
      } catch (error) {
        errorService.reportError(error, { operation: 'tts.initialize' });
        update((s) => ({
          ...s,
          status: 'error',
          error: get(t)('tts.init_error'),
          isServiceReady: false,
        }));
      }
    },

    async startReading(): Promise<void> {
      const { status, isServiceReady } = get(store);
      if (!isServiceReady || !['idle', 'error'].includes(status)) return;

      const { instance: editor } = get(editorStore);
      const { docId } = get(documentStore);
      if (!editor || !docId) return;

      const nodes = getReadableNodes(editor);
      if (nodes.length === 0) {
        toast.info(get(t)('tts.no_readable_content_toast'));
        return;
      }

      update((s) => ({ ...s, nodesToRead: nodes, status: 'initializing' }));

      try {
        const docStatus = await offlineStore.getDocStatus(docId);
        if (docStatus === 'downloaded') {
          document.body.classList.add('is-reading-aloud');
          speakNodeAtIndex(0);
        } else {
          update((s) => ({ ...s, status: 'awaiting_download' }));
          const { selectedVoiceId } = get(store);
          if (!selectedVoiceId)
            throw new Error('No voice selected for download.');
          await offlineStore.downloadDocument(docId, selectedVoiceId);
          if (get(store).status === 'awaiting_download') {
            document.body.classList.add('is-reading-aloud');
            speakNodeAtIndex(0);
          }
        }
      } catch (err) {
        errorService.reportError(err as Error, {
          operation: 'tts.startReading.workflow',
        });
        transitionToIdle(true);
      }
    },

    stopReading: () => transitionToIdle(true),

    pauseReading: () => {
      if (get(store).status === 'playing') {
        ttsService?.pause();
        update((s) => ({ ...s, status: 'paused' }));
      }
    },

    resumeReading: () => {
      if (get(store).status === 'paused') {
        ttsService?.resume();
        update((s) => ({ ...s, status: 'playing' }));
      }
    },

    setVoice: (voiceId: string) => {
      update((s) => ({ ...s, selectedVoiceId: voiceId }));
      if (get(store).status !== 'idle') {
        toast.info(get(t)('offline.voice_change_requires_redownload'));
      }
    },

    setRate: (rate: number) => {
      update((s) => ({ ...s, rate }));
      if (['playing', 'paused'].includes(get(store).status)) {
        speakNodeAtIndex(get(store).currentNodeIndex);
      }
    },

    nextNode: () => {
      const currentIndex = get(store).currentNodeIndex;
      speakNodeAtIndex(currentIndex + 1);
    },

    previousNode: () => {
      const currentIndex = get(store).currentNodeIndex;
      speakNodeAtIndex(currentIndex - 1);
    },
  };

  return publicMethods;
}

export const ttsStore = createTtsStore();
