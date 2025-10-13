import { writable, get } from 'svelte/store';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TTSService, TTSVoice } from '$lib/services/tts/tts.service';
import { BrowserTTSService } from '$lib/services/tts/BrowserTTSService';

// --- Estado: Define la estructura de datos del store ---
/**
 * Defines the possible statuses for the Text-to-Speech (TTS) service.
 */
export type TTSStatus =
  | 'idle'
  | 'initializing'
  | 'playing'
  | 'paused'
  | 'error';

/**
 * Represents the state of the TTS store.
 */
export interface TTSState {
  /** The current status of the TTS service. */
  status: TTSStatus;
  /** The list of document nodes to be read aloud. */
  nodesToRead: { pos: number; node: ProseMirrorNode; text: string }[];
  /** The index of the current node being read. */
  currentNodeIndex: number;
  /** The set of decorations for highlighting the currently read node and word. */
  decorationSet: DecorationSet;
  /** The list of available TTS voices. */
  availableVoices: TTSVoice[];
  /** The ID of the currently selected voice. */
  selectedVoiceId: string | null;
  /** The speech rate. */
  rate: number;
  /** The speech pitch. */
  pitch: number;
  /** An error message, if any. */
  error: string | null;
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
};

const ttsService: TTSService = new BrowserTTSService();
const store = writable<TTSState>(initialState);
const { subscribe, update, set } = store;

let unsubscribeFromEditor: (() => void) | null = null;

editorStore.subscribe(($editorStore) => {
  if (unsubscribeFromEditor) {
    unsubscribeFromEditor();
    unsubscribeFromEditor = null;
  }

  if ($editorStore.instance) {
    const editor = $editorStore.instance;
    const handleTransaction = () => {
      const state = get(store);
      if (state.status === 'playing' || state.status === 'paused') {
        console.warn(
          'A change was detected in the document while reading. Stopping playback.',
        );
        stopReading(true);
      }
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

/**
 * Speaks the next node in the queue.
 */
function speakNextNode() {
  const state = get(store);

  if (state.currentNodeIndex >= state.nodesToRead.length) {
    stopReading(false);
    update((s) => ({
      ...s,
      status: 'idle',
      decorationSet: DecorationSet.empty,
    }));
    return;
  }

  const currentNode = state.nodesToRead[state.currentNodeIndex];
  const { selectedVoiceId, rate, pitch } = state;

  if (!selectedVoiceId) {
    update((s) => ({
      ...s,
      status: 'error',
      error: 'No voice is selected.',
    }));
    return;
  }

  highlightCurrentNode();

  ttsService.speak(currentNode.text, {
    voiceId: selectedVoiceId,
    rate,
    pitch,
    onEnd: () => {
      if (get(store).status === 'playing') {
        update((s) => ({ ...s, currentNodeIndex: s.currentNodeIndex + 1 }));
        speakNextNode();
      }
    },
    onBoundary: handleWordBoundary,
    onError: (error) => {
      console.error('TTS Service Error:', error);
      update((s) => ({
        ...s,
        status: 'error',
        error: 'An error occurred during playback.',
      }));
    },
  });
}

/**
 * Handles the word boundary event during speech synthesis to highlight the current word.
 * @param {SpeechSynthesisEvent} event - The speech synthesis event.
 */
function handleWordBoundary(event: SpeechSynthesisEvent) {
  const state = get(store);
  const editor = get(editorStore).instance;
  if (!editor || state.status !== 'playing') return;

  const currentNodeInfo = state.nodesToRead[state.currentNodeIndex];
  if (!currentNodeInfo) return;

  const from = currentNodeInfo.pos + 1 + event.charIndex;
  const text = currentNodeInfo.text;
  let to = text.indexOf(' ', from - currentNodeInfo.pos - 1);
  if (to === -1) {
    to = text.length;
  }
  to += currentNodeInfo.pos + 1;

  const wordDecoration = Decoration.inline(from, to, {
    class: 'is-current-tts-word',
  });
  const nodeDecoration = Decoration.node(
    currentNodeInfo.pos,
    currentNodeInfo.pos + currentNodeInfo.node.nodeSize,
    { class: 'is-current-tts-node' },
  );

  const newDecorationSet = DecorationSet.create(editor.state.doc, [
    nodeDecoration,
    wordDecoration,
  ]);
  update((s) => ({ ...s, decorationSet: newDecorationSet }));
}

/**
 * Highlights the current node being read in the editor.
 */
function highlightCurrentNode() {
  const editor = get(editorStore).instance;
  const state = get(store);
  if (!editor || (state.status !== 'playing' && state.status !== 'paused')) {
    update((s) => ({ ...s, decorationSet: DecorationSet.empty }));
    return;
  }

  const currentNodeInfo = state.nodesToRead[state.currentNodeIndex];
  if (!currentNodeInfo) return;

  const nodeDecoration = Decoration.node(
    currentNodeInfo.pos,
    currentNodeInfo.pos + currentNodeInfo.node.nodeSize,
    { class: 'is-current-tts-node' },
  );

  const newDecorationSet = DecorationSet.create(editor.state.doc, [
    nodeDecoration,
  ]);
  update((s) => ({ ...s, decorationSet: newDecorationSet }));
}

/**
 * Initializes the TTS service, fetching available voices.
 */
async function initialize() {
  if (
    get(store).availableVoices.length > 0 ||
    get(store).status === 'initializing'
  )
    return;

  update((s) => ({ ...s, status: 'initializing' }));
  try {
    await ttsService.initialize();
    const voices = ttsService.getVoices();

    if (voices.length === 0) {
      throw new Error('No TTS voices found in this browser.');
    }

    const userLang = navigator.language || 'en-US';
    const defaultVoice =
      voices.find((v) => v.lang === userLang) ||
      voices.find((v) => v.lang.startsWith(userLang.split('-')[0])) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    update((s) => ({
      ...s,
      status: 'idle',
      availableVoices: voices,
      selectedVoiceId: defaultVoice.id,
      error: null,
    }));
  } catch (e: any) {
    console.error('Failed to initialize TTS service:', e);
    update((s) => ({
      ...s,
      status: 'error',
      error: e.message || 'Could not initialize the voice engine.',
    }));
  }
}

/**
 * Starts reading the document from the beginning.
 */
async function startReading() {
  const storeValue = get(store);

  if (
    storeValue.availableVoices.length === 0 &&
    storeValue.status !== 'error'
  ) {
    if (storeValue.status === 'initializing') {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return startReading();
    } else {
      await initialize();
    }
  }

  const finalStoreValue = get(store);
  const editor = get(editorStore).instance;

  if (
    !editor ||
    finalStoreValue.status === 'playing' ||
    finalStoreValue.status === 'error'
  ) {
    return;
  }

  if (!finalStoreValue.selectedVoiceId) {
    update((s) => ({
      ...s,
      status: 'error',
      error: 'Could not select a default voice.',
    }));
    return;
  }

  ttsService.cancel();

  const nodes: TTSState['nodesToRead'] = [];
  editor.state.doc.descendants((node, pos) => {
    const textContent = node.textContent.trim();
    if (node.type.name === 'listItem' && textContent.length > 0) {
      nodes.push({ pos, node, text: textContent });
    }
  });

  if (nodes.length === 0) return;

  update((s) => ({
    ...s,
    status: 'playing',
    nodesToRead: nodes,
    currentNodeIndex: 0,
    error: null,
  }));

  speakNextNode();
}

/**
 * Stops the current playback.
 * @param {boolean} reset - If true, resets the store to its initial state.
 */
function stopReading(reset: boolean) {
  ttsService.cancel();
  if (reset) {
    const currentState = get(store);
    set({
      ...initialState,
      availableVoices: currentState.availableVoices,
      selectedVoiceId: currentState.selectedVoiceId,
      rate: currentState.rate,
      pitch: currentState.pitch,
    });
  }
}

/**
 * Pauses the current playback.
 */
function pauseReading() {
  if (get(store).status === 'playing') {
    ttsService.pause();
    update((s) => ({ ...s, status: 'paused' }));
  }
}

/**
 * Resumes the paused playback.
 */
function resumeReading() {
  if (get(store).status === 'paused') {
    ttsService.resume();
    update((s) => ({ ...s, status: 'playing' }));
  }
}

/**
 * Sets the voice to be used for speech synthesis.
 * @param {string} voiceId - The ID of the voice to select.
 */
function setVoice(voiceId: string) {
  update((s) => ({ ...s, selectedVoiceId: voiceId }));
}

/**
 * Sets the speech rate.
 * @param {number} rate - The desired speech rate.
 */
function setRate(rate: number) {
  update((s) => ({ ...s, rate }));
}

/**
 * The public API for the TTS store.
 */
export const ttsStore = {
  subscribe,
  initialize,
  startReading,
  stopReading: () => stopReading(true),
  pauseReading,
  resumeReading,
  setVoice,
  setRate,
};
