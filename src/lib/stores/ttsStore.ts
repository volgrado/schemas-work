// src/lib/stores/ttsStore.ts

import { writable, get } from 'svelte/store';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { toast } from 'svelte-sonner';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';
import type { Unsubscriber } from 'svelte/store';
import type { Editor } from '@tiptap/core';
import { t } from '$lib/utils/i18n';
import { EdgeAudioTTSService } from '$lib/services/tts/EdgeAudioTTSService';
import type { TTSVoice } from '$lib/services/tts/tts.service';
// Imports para la lógica offline
import { documentStore } from './documentStore';
import { offlineStore } from './offlineStore';

// --- Interfaces ---
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
  currentSpeechId: null,
};

// --- Configuración ---
const ttsService: EdgeAudioTTSService = new EdgeAudioTTSService();
const store = writable<TTSState>(initialState);
const { subscribe, update, set } = store;
let unsubscribeFromEditor: Unsubscriber | null = null;

// --- Funciones Internas ---

// MODIFICACIÓN: Exportamos la función para que otros módulos (como offlineStore) puedan usarla.
export function getReadableNodes(editor: Editor): ReadableNode[] {
  const nodes: ReadableNode[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (
      (node.type.name === 'heading' || node.type.name === 'listItem') &&
      node.textContent.trim()
    ) {
      // --- START OF NEW '.' LOGIC ---

      let title = '';
      let content = '';
      const fullText = node.textContent.trim();

      // Intelligently separate the title from the main content.
      if (node.type.name === 'heading') {
        title = fullText;
        content = '';
      } else if (node.type.name === 'listItem' && node.firstChild) {
        title = node.firstChild.textContent.trim();
        if (fullText.length > title.length) {
          content = fullText.substring(title.length).trim();
        }
      } else {
        // Fallback for unexpected structures.
        title = fullText;
        content = '';
      }

      // If there's no content, just use the title as is.
      if (!content) {
        nodes.push({
          pos,
          node,
          title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
          textToSpeak: title,
        });
        return node.type.name !== 'listItem';
      }

      // Check if the title already ends with punctuation.
      const endsWithPunctuation = /[.?!]$/.test(title);

      // Combine title and content with a period to create a pause.
      // If the title already has punctuation, we just add a space.
      const textToSpeak = endsWithPunctuation
        ? `${title} ${content}`
        : `${title}. ${content}`;

      nodes.push({
        pos,
        node,
        // The display title for the UI is still clean.
        title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
        // The text to speak now includes the period for a natural pause.
        textToSpeak: textToSpeak,
      });

      // --- END OF NEW '.' LOGIC ---
    }
    return node.type.name !== 'listItem';
  });
  return nodes;
}

// MODIFICACIÓN: La función ahora es 'async' para poder consultar el estado offline.
async function speakNodeAtIndex(index: number) {
  const state = get(store);
  if (index < 0 || index >= state.nodesToRead.length) {
    stopReading(true);
    toast.success(get(t)('tts.finished_reading_toast'));
    return;
  }

  const nodeToRead = state.nodesToRead[index];
  const speechId = uuidv4();

  update((s) => ({
    ...s,
    currentNodeIndex: index,
    status: 'playing',
    currentSpeechId: speechId,
  }));
  highlightCurrentNode();

  // --- INICIO DE LA LÓGICA OFFLINE ---
  const docId = get(documentStore).docId;
  const docStatus = await offlineStore.getDocStatus(docId);

  let audioId: string | undefined = undefined;
  // Usamos el audio de la caché solo si está descargado y actualizado.
  if (docId && docStatus === 'downloaded') {
    audioId = `${docId}_${index}`;
  }
  // --- FIN DE LA LÓGICA OFFLINE ---

  ttsService.speak(nodeToRead.textToSpeak, {
    voiceId: state.selectedVoiceId!,
    rate: state.rate,
    pitch: state.pitch,
    audioId: audioId, // Pasamos el ID (o undefined) al servicio de audio
    onEnd: () => {
      if (get(store).currentSpeechId === speechId) {
        nextNode();
      }
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
}

function highlightCurrentNode() {
  const editor = get(editorStore).instance;
  const state = get(store);
  if (!editor || state.nodesToRead.length === 0) return;
  const currentNode = state.nodesToRead[state.currentNodeIndex];
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

function stopReading(reset: boolean) {
  ttsService.cancel();
  document.body.classList.remove('is-reading-aloud');
  if (reset) {
    set(initialState);
  } else {
    update((s) => ({
      ...s,
      status: 'idle',
      decorationSet: DecorationSet.empty,
      currentSpeechId: null,
    }));
  }
}

function nextNode() {
  ttsService.cancel();
  const currentIndex = get(store).currentNodeIndex;
  speakNodeAtIndex(currentIndex + 1);
}

editorStore.subscribe(($editorStore) => {
  if (unsubscribeFromEditor) unsubscribeFromEditor();
  if ($editorStore.instance) {
    const editor = $editorStore.instance;
    let previousDoc: ProseMirrorNode | null = editor.state.doc;
    const handleTransaction = () => {
      const state = get(store);
      const currentDoc = editor.state.doc;
      if (
        ['playing', 'paused'].includes(state.status) &&
        previousDoc &&
        !currentDoc.eq(previousDoc)
      ) {
        toast.info(get(t)('tts.stopped_due_to_changes_toast'));
        stopReading(true);
      }
      previousDoc = currentDoc;
    };
    editor.on('transaction', handleTransaction);
    unsubscribeFromEditor = () => {
      editor.off('transaction', handleTransaction);
      previousDoc = null;
    };
  }
});

// --- Interfaz Pública ---
export const ttsStore = {
  subscribe,
  getReadableNodes, // MODIFICACIÓN: Exponemos la función para que la use el offlineStore

  async initialize(): Promise<void> {
    if (get(store).availableVoices.length > 0) return;
    update((s) => ({ ...s, status: 'initializing' }));
    try {
      const voices = ttsService.getVoices();
      const preferredVoice =
        voices.find((v) => v.id === 'en-US-JennyNeural') || voices[0];
      update((s) => ({
        ...s,
        status: 'idle',
        availableVoices: voices,
        selectedVoiceId: preferredVoice ? preferredVoice.id : null,
      }));
    } catch (error) {
      errorService.reportError(error, { operation: 'tts.initialize' });
      update((s) => ({
        ...s,
        status: 'error',
        error: get(t)('tts.init_error'),
      }));
    }
  },

  async startReading(): Promise<void> {
    const editor = get(editorStore).instance;
    if (!editor) return;
    await this.initialize();
    const nodes = getReadableNodes(editor);
    if (nodes.length === 0) {
      toast.info(get(t)('tts.no_readable_content_toast'));
      return;
    }
    document.body.classList.add('is-reading-aloud');
    update((s) => ({ ...s, nodesToRead: nodes }));
    speakNodeAtIndex(0);
  },
  async startReadingFromNode(nodeId: string): Promise<void> {
    const editor = get(editorStore).instance;
    if (!editor) return;
    await this.initialize();
    const nodes = getReadableNodes(editor);
    const startIndex = nodes.findIndex((n) => n.node.attrs.nodeId === nodeId);
    if (startIndex === -1) {
      toast.error(get(t)('tts.node_not_found_error'));
      return;
    }
    document.body.classList.add('is-reading-aloud');
    update((s) => ({ ...s, nodesToRead: nodes }));
    speakNodeAtIndex(startIndex);
  },

  stopReading: () => stopReading(true),

  pauseReading: () => {
    if (get(store).status !== 'playing') return;
    ttsService.pause();
    update((s) => ({ ...s, status: 'paused' }));
  },

  resumeReading: () => {
    if (get(store).status !== 'paused') return;
    ttsService.resume();
    update((s) => ({ ...s, status: 'playing' }));
  },

  setVoice: (voiceId: string) => {
    update((s) => ({ ...s, selectedVoiceId: voiceId }));
    if (['playing', 'paused'].includes(get(store).status)) {
      ttsService.cancel();
      speakNodeAtIndex(get(store).currentNodeIndex);
    }
  },

  setRate: (rate: number) => {
    update((s) => ({ ...s, rate }));
    if (['playing', 'paused'].includes(get(store).status)) {
      ttsService.cancel();
      speakNodeAtIndex(get(store).currentNodeIndex);
    }
  },

  nextNode: () => nextNode(),

  previousNode: () => {
    ttsService.cancel();
    const currentIndex = get(store).currentNodeIndex;
    speakNodeAtIndex(currentIndex - 1);
  },
};
