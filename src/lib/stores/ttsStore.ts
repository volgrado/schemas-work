/**
 * @file Manages the global state and orchestration for the Text-to-Speech (TTS) feature.
 * @module ttsStore
 */

import { writable, get } from 'svelte/store';
import { editorStore } from './editorStore';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TTSService, TTSVoice } from '$lib/services/tts/tts.service';
import { BrowserTTSService } from '$lib/services/tts/BrowserTTSService';
import { toast } from 'svelte-sonner';
import { v4 as uuidv4 } from 'uuid';
import * as errorService from '$lib/services/core/errorService';
import type { Unsubscriber } from 'svelte/store';
import type { Editor } from '@tiptap/core';
import { t } from '$lib/utils/i18n';

// --- (All of your original interfaces are kept) ---
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
  wordMap: { word: string; from: number; to: number }[];
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

const ttsService: TTSService = new BrowserTTSService();
const store = writable<TTSState>(initialState);
const { subscribe, update, set } = store;
let unsubscribeFromEditor: Unsubscriber | null = null;

// --- NEW: MEDIA SESSION & BACKGROUND AUDIO MANAGEMENT ---

/** Manages the silent audio element to maintain background execution. */
const backgroundAudio = {
  play: () => {
    console.log('Attempting to play background audio...'); // <-- ADD THIS
    const audio = document.getElementById(
      'background-audio-player'
    ) as HTMLAudioElement;
    if (audio && audio.paused) {
      audio.play().catch((e) => {
        console.error('BACKGROUND AUDIO FAILED TO PLAY:', e); // <-- ADD THIS
      });
    }
  },
  pause: () => {
    const audio = document.getElementById(
      'background-audio-player'
    ) as HTMLAudioElement;
    if (audio && !audio.paused) {
      audio.pause();
    }
  },
};

/** Updates the OS media notification (lock screen widget) with the current track info. */
function updateMediaSession() {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

  const state = get(store);
  const { status, nodesToRead, currentNodeIndex } = state;

  if (status === 'idle' || status === 'error' || nodesToRead.length === 0) {
    if (navigator.mediaSession.metadata !== null) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
    return;
  }

  const currentNode = nodesToRead[currentNodeIndex];
  if (!currentNode) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: currentNode.title,
    artist: 'Schemas.Work',
    album: `Section ${currentNodeIndex + 1} of ${nodesToRead.length}`,

    // --- THIS SECTION IS UPDATED TO USE YOUR FILES ---
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
    // ---------------------------------------------------
  });

  navigator.mediaSession.playbackState =
    status === 'playing' ? 'playing' : 'paused';

  console.log('Updated Media Session:', {
    // <-- ADD THIS BLOCK
    state: navigator.mediaSession.playbackState,
    title: navigator.mediaSession.metadata?.title,
  });
}
/** Sets up the media action handlers (play, pause, etc. from lock screen) once. */
function setupMediaSessionHandlers() {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

  const actions: [MediaSessionAction, () => void][] = [
    ['play', () => ttsStore.resumeReading()],
    ['pause', () => ttsStore.pauseReading()],
    ['nexttrack', () => ttsStore.nextNode()],
    ['previoustrack', () => ttsStore.previousNode()],
    ['stop', () => ttsStore.stopReading()],
  ];

  for (const [action, handler] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      console.warn(`The media session action '${action}' is not supported.`);
    }
  }
}

// Run this once when the module loads
setupMediaSessionHandlers();

// --- (All your original functions are below, with minor modifications) ---

function getReadableNodes(editor: Editor): ReadableNode[] {
  const nodes: ReadableNode[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (
      (node.type.name === 'heading' || node.type.name === 'listItem') &&
      node.textContent.trim()
    ) {
      const textToSpeak = node.textContent.trim();
      const wordMap: { word: string; from: number; to: number }[] = [];
      let offset = 0;
      textToSpeak.split(/\s+/).forEach((word) => {
        if (word) {
          const from = pos + 1 + offset;
          const to = from + word.length;
          wordMap.push({ word, from, to });
          offset = to - pos - 1 + 1;
        }
      });

      nodes.push({
        pos,
        node,
        title:
          textToSpeak.substring(0, 50) + (textToSpeak.length > 50 ? '...' : ''),
        textToSpeak,
        wordMap,
      });
    }
    return node.type.name !== 'listItem';
  });
  return nodes;
}

function speakNodeAtIndex(index: number) {
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

  ttsService.speak(nodeToRead.textToSpeak, {
    voiceId: state.selectedVoiceId!,
    rate: state.rate,
    pitch: state.pitch,
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
    onBoundary: (event) => {
      if (get(store).currentSpeechId === speechId) {
        handleWordBoundary(event, nodeToRead.wordMap);
      }
    },
  });
}

function handleWordBoundary(
  event: SpeechSynthesisEvent,
  wordMap: ReadableNode['wordMap']
) {
  const editor = get(editorStore).instance;
  if (!editor) return;

  const state = get(store);
  const currentNode = state.nodesToRead[state.currentNodeIndex];
  const spokenText = currentNode.textToSpeak;
  const charIndex = event.charIndex;

  const currentWord = wordMap.find((w) => {
    // A slightly more robust way to find the word index
    const wordStartIndex = spokenText.indexOf(
      w.word,
      charIndex > 0 ? charIndex - 5 : 0
    );
    const wordEndIndex = wordStartIndex + w.word.length;
    return charIndex >= wordStartIndex && charIndex < wordEndIndex;
  });

  if (currentWord) {
    const wordDeco = Decoration.inline(currentWord.from, currentWord.to, {
      class: 'is-current-tts-word',
    });
    const nodeDeco = Decoration.node(
      currentNode.pos,
      currentNode.pos + currentNode.node.nodeSize,
      { class: 'is-current-tts-node' }
    );
    update((s) => ({
      ...s,
      decorationSet: DecorationSet.create(editor.state.doc, [
        nodeDeco,
        wordDeco,
      ]),
    }));
  }
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
  backgroundAudio.pause(); // MODIFIED: Stop the background audio
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

export const ttsStore = {
  subscribe,
  async initialize(): Promise<void> {
    if (get(store).availableVoices.length > 0) return;

    update((s) => ({ ...s, status: 'initializing' }));
    try {
      await ttsService.initialize();
      const voices = ttsService.getVoices();
      const preferredVoice =
        voices.find((v) => v.id.includes('Google') && v.lang === 'en-GB') ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
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
      throw error;
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

    backgroundAudio.play(); // MODIFIED: Start the background audio
    document.body.classList.add('is-reading-aloud');
    update((s) => ({ ...s, nodesToRead: nodes, status: 'playing' }));
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

    backgroundAudio.play(); // MODIFIED: Start the background audio
    document.body.classList.add('is-reading-aloud');
    update((s) => ({ ...s, nodesToRead: nodes, status: 'playing' }));
    speakNodeAtIndex(startIndex);
  },

  stopReading: () => stopReading(true),

  pauseReading: () => {
    const state = get(store);
    if (state.status !== 'playing') return;
    ttsService.pause();
    update((s) => ({ ...s, status: 'paused' }));
  },

  resumeReading: () => {
    const state = get(store);
    if (state.status !== 'paused') return;
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

// NEW: This subscription automatically keeps the media session updated whenever the state changes.
store.subscribe(() => {
  updateMediaSession();
});
