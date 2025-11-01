/**
 * @file Manages the state and operations for Text-to-Speech (TTS) playback.
 * This is a robust, pure client-side implementation using the browser's
 * built-in Web Speech API, managing a playlist of utterances for fine-grained control
 * and updating editor decorations for text highlighting.
 * @module ttsStore
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { toast } from 'svelte-sonner';
import { t } from '$lib/utils/i18n';
import type { TTSStatus, ReadableNode, TTSVoice } from '$lib/types';

// --- FIX: Re-add necessary imports for editor integration ---
import { Decoration, DecorationSet } from 'prosemirror-view';
import { editorStore } from './editorStore';

// --- State Definition ---
export interface TTSState {
  status: TTSStatus;
  nodesToRead: ReadableNode[];
  currentNodeIndex: number;
  decorationSet: DecorationSet; // FIX: Property re-added
  availableVoices: TTSVoice[];
  selectedVoiceId: string | null;
  rate: number;
  volume: number;
  error: string | null;
  isServiceReady: boolean;
  currentSpeechId: string | null;
}

const initialState: TTSState = {
  status: 'idle',
  nodesToRead: [],
  currentNodeIndex: 0,
  decorationSet: DecorationSet.empty, // FIX: Initialized as empty
  availableVoices: [],
  selectedVoiceId: null,
  rate: 1,
  volume: 1,
  error: null,
  isServiceReady: false,
  currentSpeechId: null,
};

// A simple, universally compatible UUID generator
function generateSimpleUUID(): string {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function createTtsStore() {
  const store = writable<TTSState>(initialState);
  const { subscribe, update, set } = store;

  let isInitialized = false;
  let isConfigDirty = false;

  // --- Private Helpers ---

  /**
   * FIX: This function is re-introduced to handle editor highlighting.
   * It creates a DecorationSet for the currently active text node.
   */
  function highlightCurrentNode() {
    const { instance: editor } = get(editorStore);
    const { nodesToRead, currentNodeIndex, status } = get(store);

    // If not playing/paused or no editor, ensure decorations are cleared.
    if (
      !editor ||
      !['playing', 'paused'].includes(status) ||
      nodesToRead.length === 0
    ) {
      if (get(store).decorationSet !== DecorationSet.empty) {
        update((s) => ({ ...s, decorationSet: DecorationSet.empty }));
      }
      return;
    }

    const currentNode = nodesToRead[currentNodeIndex];
    if (!currentNode) {
      update((s) => ({ ...s, decorationSet: DecorationSet.empty }));
      return;
    }

    // Create a decoration that wraps the current node with a CSS class.
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

  function transitionToIdle() {
    window.speechSynthesis.cancel();
    isConfigDirty = false;
    update((s) => ({
      ...s,
      status: 'idle',
      error: null,
      currentNodeIndex: 0,
      nodesToRead: [],
      currentSpeechId: null,
      decorationSet: DecorationSet.empty, // FIX: Clear decorations on stop
    }));
  }

  async function loadVoices() {
    if (!browser) return;
    try {
      const getBrowserVoices = (): Promise<SpeechSynthesisVoice[]> =>
        new Promise((resolve) => {
          let voices = window.speechSynthesis.getVoices();
          if (voices.length) return resolve(voices);
          window.speechSynthesis.onvoiceschanged = () =>
            resolve(window.speechSynthesis.getVoices());
        });
      const browserVoices = await getBrowserVoices();
      const formattedVoices: TTSVoice[] = browserVoices.map((v) => ({
        id: v.voiceURI,
        name: `${v.name} (${v.lang})`,
        lang: v.lang,
      }));
      const defaultVoice =
        formattedVoices.find((v) => v.lang.startsWith('en-')) ||
        formattedVoices[0];
      update((s) => ({
        ...s,
        availableVoices: formattedVoices,
        selectedVoiceId: defaultVoice?.id ?? null,
      }));
    } catch (err) {
      update((s) => ({
        ...s,
        status: 'error',
        error: get(t)('tts.init_error'),
      }));
    }
  }

  function _speakNodeAtIndex(index: number) {
    const { nodesToRead, selectedVoiceId, rate, volume } = get(store);
    if (index >= nodesToRead.length) {
      toast.success(get(t)('tts.finished_reading_toast'));
      transitionToIdle();
      return;
    }
    const node = nodesToRead[index];
    const text = (node.text || node.textToSpeak || '').trim();
    if (!text) {
      publicMethods.nextNode();
      return;
    }
    const speechId = generateSimpleUUID();
    const browserVoice = window.speechSynthesis
      .getVoices()
      .find((v) => v.voiceURI === selectedVoiceId);
    const utterance = new SpeechSynthesisUtterance(text);
    if (browserVoice) utterance.voice = browserVoice;
    utterance.rate = rate;
    utterance.volume = volume;
    utterance.onend = () => {
      if (
        get(store).status === 'playing' &&
        get(store).currentSpeechId === speechId
      ) {
        publicMethods.nextNode();
      }
    };
    utterance.onerror = (e) => {
      if (get(store).currentSpeechId === speechId) {
        update((s) => ({
          ...s,
          status: 'error',
          error: get(t)('tts.playback_error'),
        }));
      }
    };
    update((s) => ({
      ...s,
      currentNodeIndex: index,
      status: 'playing',
      currentSpeechId: speechId,
    }));
    highlightCurrentNode(); // FIX: Update the highlight when a new node starts.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const publicMethods = {
    subscribe,
    initialize(): void {
      if (isInitialized || !browser) return;
      isInitialized = true;
      update((s) => ({ ...s, status: 'initializing' }));
      loadVoices().then(() => {
        update((s) => ({ ...s, status: 'idle', isServiceReady: true }));
      });
    },
    startReading(nodes: ReadableNode[]): void {
      if (!isInitialized) this.initialize();
      transitionToIdle();
      if (nodes.length === 0) {
        toast.info(get(t)('tts.no_readable_content_toast'));
        return;
      }
      isConfigDirty = false;
      update((s) => ({ ...s, nodesToRead: nodes }));
      _speakNodeAtIndex(0);
    },
    stopReading: () => transitionToIdle(),
    pauseReading(): void {
      if (get(store).status === 'playing') {
        window.speechSynthesis.pause();
        update((s) => ({ ...s, status: 'paused' }));
        // Keep the highlight active when paused
        highlightCurrentNode();
      }
    },
    resumeReading(): void {
      const status = get(store).status;
      if (status !== 'paused') return;
      if (isConfigDirty) {
        isConfigDirty = false;
        _speakNodeAtIndex(get(store).currentNodeIndex);
      } else {
        window.speechSynthesis.resume();
        update((s) => ({ ...s, status: 'playing' }));
        // Ensure highlight is correct on resume
        highlightCurrentNode();
      }
    },
    _handleSettingChange(updateFn: () => void, toastMessage: string) {
      updateFn();
      const status = get(store).status;
      if (['playing', 'paused'].includes(status)) {
        isConfigDirty = true;
        if (status === 'playing') publicMethods.pauseReading();
        toast.info(toastMessage);
      }
    },
    setVoice(voiceId: string): void {
      publicMethods._handleSettingChange(
        () => update((s) => ({ ...s, selectedVoiceId: voiceId })),
        get(t)('tts.voice_changed_toast')
      );
    },
    setRate(newRate: number): void {
      publicMethods._handleSettingChange(
        () => update((s) => ({ ...s, rate: newRate })),
        get(t)('tts.speed_changed_toast')
      );
    },
    setVolume(newVolume: number): void {
      publicMethods._handleSettingChange(
        () => update((s) => ({ ...s, volume: newVolume })),
        get(t)('tts.volume_changed_toast')
      );
    },
    nextNode(): void {
      const currentIndex = get(store).currentNodeIndex;
      _speakNodeAtIndex(currentIndex + 1);
    },
    previousNode(): void {
      const currentIndex = get(store).currentNodeIndex;
      if (currentIndex > 0) _speakNodeAtIndex(currentIndex - 1);
    },
    replay(): void {
      const currentNodes = get(store).nodesToRead;
      if (currentNodes.length > 0) {
        transitionToIdle();
        setTimeout(() => publicMethods.startReading(currentNodes), 50);
      }
    },
  };

  return publicMethods;
}

export const ttsStore = createTtsStore();
