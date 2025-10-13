import { writable, get } from 'svelte/store';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TTSService, TTSVoice } from '$lib/services/tts/tts.service';
import { BrowserTTSService } from '$lib/services/tts/BrowserTTSService';
import { toast } from 'svelte-sonner';

// --- State Definition ---
export type TTSStatus =
  | 'idle'
  | 'initializing'
  | 'playing'
  | 'paused'
  | 'error';

export interface ReadableNode {
  pos: number;
  node: ProseMirrorNode;
  title: string;
  textToSpeak: string;
}

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

// --- Store Creation ---
const ttsService: TTSService = new BrowserTTSService();
const store = writable<TTSState>(initialState);
const { subscribe, update, set } = store;

// --- Internal Logic ---

async function _prepareAndPlay() {
  try {
    if (get(store).availableVoices.length === 0) {
      await initialize();
    }
    if (get(store).status === 'error') return;

    const editor = get(editorStore).instance;
    if (!editor) throw new Error('Editor not available.');

    const nodes: ReadableNode[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'listItem') {
        let termText = '';
        // FIXED: Use an array to collect all description paragraphs' content.
        const descriptionParts: string[] = [];

        node.forEach((childNode) => {
          if (childNode.attrs.role === 'term') {
            termText = childNode.textContent.trim();
          } else if (childNode.attrs.role === 'description') {
            // FIXED: Add each non-empty paragraph to the parts array.
            const part = childNode.textContent.trim();
            if (part) {
              descriptionParts.push(part);
            }
          }
        });

        // FIXED: Join all parts into a single string.
        const fullDescription = descriptionParts.join(' ');

        if (termText) {
          nodes.push({
            pos,
            node,
            title: termText,
            textToSpeak: fullDescription
              ? `${termText}. ${fullDescription}`
              : termText,
          });
        }
      }
    });

    if (nodes.length === 0) {
      toast.info(
        'There is no structured content (terms/descriptions) to read in this document.'
      );
      set({ ...get(store), status: 'idle' });
      return;
    }

    ttsService.cancel();
    update((s) => ({
      ...s,
      nodesToRead: nodes,
      currentNodeIndex: 0,
    }));

    speakNodeAtIndex(0);
  } catch (e: any) {
    console.error('[ttsStore] Error during _prepareAndPlay:', e);
    update((s) => ({
      ...s,
      status: 'error',
      error: e.message || 'Could not start reading.',
    }));
  }
}

// --- Reactive Trigger ---
let isPreparing = false;
store.subscribe((currentState) => {
  if (currentState.status === 'initializing' && !isPreparing) {
    isPreparing = true;
    _prepareAndPlay().finally(() => {
      isPreparing = false;
    });
  }
});

function startReading() {
  const currentStatus = get(store).status;
  if (
    currentStatus === 'playing' ||
    currentStatus === 'paused' ||
    currentStatus === 'initializing'
  ) {
    return;
  }
  update((s) => ({ ...s, status: 'initializing', error: null }));
}

function speakNodeAtIndex(index: number) {
  const state = get(store);
  if (index >= state.nodesToRead.length) {
    stopReading(false);
    toast.success('Schema reading complete!');
    return;
  }

  update((s) => ({ ...s, currentNodeIndex: index, status: 'playing' }));
  highlightCurrentNode();

  const currentNode = state.nodesToRead[index];
  const { selectedVoiceId, rate, pitch } = get(store);

  if (!selectedVoiceId) {
    update((s) => ({ ...s, status: 'error', error: 'No voice is selected.' }));
    return;
  }

  ttsService.speak(currentNode.textToSpeak, {
    voiceId: selectedVoiceId,
    rate,
    pitch,
    onEnd: () => {
      if (get(store).status === 'playing') {
        speakNodeAtIndex(get(store).currentNodeIndex + 1);
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
        toast.info('Playback stopped due to document changes.');
        stopReading(true);
      }
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
    };
  }
});

function handleWordBoundary(event: SpeechSynthesisEvent) {
  const state = get(store);
  const editor = get(editorStore).instance;
  if (!editor || state.status !== 'playing') return;

  const currentNodeInfo = state.nodesToRead[state.currentNodeIndex];
  if (!currentNodeInfo) return;

  const from = currentNodeInfo.pos + 1 + event.charIndex;
  let to = from + (event.charLength || 0);

  if (event.charLength === 0) {
    const text = currentNodeInfo.textToSpeak;
    const spaceIndex = text.indexOf(' ', event.charIndex);
    to =
      currentNodeInfo.pos + 1 + (spaceIndex !== -1 ? spaceIndex : text.length);
  }

  const wordDecoration = Decoration.inline(from, to, {
    class: 'is-current-tts-word',
  });
  const nodeDecoration = Decoration.node(
    currentNodeInfo.pos,
    currentNodeInfo.pos + currentNodeInfo.node.nodeSize,
    { class: 'is-current-tts-node' }
  );

  const newDecorationSet = DecorationSet.create(editor.state.doc, [
    nodeDecoration,
    wordDecoration,
  ]);
  update((s) => ({ ...s, decorationSet: newDecorationSet }));
}

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
    { class: 'is-current-tts-node' }
  );

  const newDecorationSet = DecorationSet.create(editor.state.doc, [
    nodeDecoration,
  ]);
  update((s) => ({ ...s, decorationSet: newDecorationSet }));
}

async function initialize() {
  if (get(store).availableVoices.length > 0) return;

  try {
    await ttsService.initialize();
    const voices = ttsService.getVoices();
    if (voices.length === 0)
      throw new Error('No TTS voices found in this browser.');

    const userLang = navigator.language || 'en-US';
    const defaultVoice =
      voices.find((v) => v.lang === userLang) ||
      voices.find((v) => v.lang.startsWith(userLang.split('-')[0])) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    update((s) => ({
      ...s,
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
  } else {
    update((s) => ({
      ...s,
      status: 'idle',
      decorationSet: DecorationSet.empty,
    }));
  }
  highlightCurrentNode();
}

function pauseReading() {
  if (get(store).status === 'playing') {
    ttsService.pause();
    update((s) => ({ ...s, status: 'paused' }));
    highlightCurrentNode();
  }
}

function resumeReading() {
  if (get(store).status === 'paused') {
    ttsService.resume();
    update((s) => ({ ...s, status: 'playing' }));
  }
}

function nextNode() {
  const state = get(store);
  if (state.currentNodeIndex < state.nodesToRead.length - 1) {
    ttsService.cancel();
    speakNodeAtIndex(state.currentNodeIndex + 1);
  }
}

function previousNode() {
  const state = get(store);
  if (state.currentNodeIndex > 0) {
    ttsService.cancel();
    speakNodeAtIndex(state.currentNodeIndex - 1);
  }
}

function restartCurrentSpeech() {
  const state = get(store);
  if (state.status === 'playing' || state.status === 'paused') {
    ttsService.cancel();
    setTimeout(() => {
      speakNodeAtIndex(state.currentNodeIndex);
    }, 50);
  }
}

function setVoice(voiceId: string) {
  update((s) => ({ ...s, selectedVoiceId: voiceId }));
  restartCurrentSpeech();
}

function setRate(rate: number) {
  update((s) => ({ ...s, rate }));
  restartCurrentSpeech();
}

export const ttsStore = {
  subscribe,
  initialize,
  startReading,
  stopReading: () => stopReading(true),
  pauseReading,
  resumeReading,
  setVoice,
  setRate,
  nextNode,
  previousNode,
};
