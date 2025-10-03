import { writable, get } from 'svelte/store';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TTSService, TTSVoice } from '$lib/services/tts/tts.service';
import { BrowserTTSService } from '$lib/services/tts/BrowserTTSService';

// --- Estado: Define la estructura de datos del store ---
export type TTSStatus =
  | 'idle'
  | 'initializing'
  | 'playing'
  | 'paused'
  | 'error';

export interface TTSState {
  status: TTSStatus;
  nodesToRead: { pos: number; node: ProseMirrorNode; text: string }[];
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

// --- Inyección del Servicio ---
const ttsService: TTSService = new BrowserTTSService();

// --- Creación del Store ---
const store = writable<TTSState>(initialState);
const { subscribe, update, set } = store;

// --- Sincronización con el Editor ---
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
          'Se detectó un cambio en el documento mientras se leía. Deteniendo la lectura.'
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

// --- Lógica Interna ---

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
      error: 'No hay una voz seleccionada.',
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
        error: 'Ocurrió un error durante la lectura.',
      }));
    },
  });
}

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

// --- Acciones Públicas: La API del Store ---

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
      throw new Error('No se encontraron voces de TTS en este navegador.');
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
      error: e.message || 'No se pudo inicializar el motor de voz.',
    }));
  }
}

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
      error: 'No se pudo seleccionar una voz por defecto.',
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

function pauseReading() {
  if (get(store).status === 'playing') {
    ttsService.pause();
    update((s) => ({ ...s, status: 'paused' }));
  }
}

function resumeReading() {
  if (get(store).status === 'paused') {
    ttsService.resume();
    update((s) => ({ ...s, status: 'playing' }));
  }
}

function setVoice(voiceId: string) {
  update((s) => ({ ...s, selectedVoiceId: voiceId }));
}

function setRate(rate: number) {
  update((s) => ({ ...s, rate }));
}

// --- Exportación de la API pública ---
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
