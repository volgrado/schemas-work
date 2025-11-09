// src/lib/stores/ttsStore.svelte.ts
/**
 * @file Manages Text-to-Speech (TTS) playback using Svelte 5 Runes and the Web Speech API.
 */
import { browser } from '$app/environment';
import { toast } from 'svelte-sonner';
import { get as getStoreValue } from 'svelte/store';
import { t } from '$lib/utils/i18n';
import type { TTS } from '$lib/types';
import { Decoration, DecorationSet } from 'prosemirror-view';

// --- VVVV THIS IS THE FIX (1/2): Import the reactive state object directly. VVVV ---
import { editorState } from './editorStore.svelte';

// --- State Definition ---

export interface TTSState {
  status: TTS.Status;
  nodesToRead: TTS.ReadableNode[];
  currentNodeIndex: number;
  decorationSet: DecorationSet;
  availableVoices: TTS.Voice[];
  selectedVoiceId: string | null;
  rate: number;
  volume: number;
  error: string | null;
  isInitialized: boolean;
  isConfigDirty: boolean;
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
  volume: 1,
  error: null,
  isInitialized: false,
  isConfigDirty: false,
  isServiceReady: false,
  currentSpeechId: null,
};

export const ttsState = $state<TTSState>({ ...initialState });

// --- Private Helper Functions ---
function generateSimpleUUID(): string {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
function transitionToIdle(): void {
  if (browser) window.speechSynthesis.cancel();
  ttsState.status = 'idle';
  ttsState.error = null;
  ttsState.currentNodeIndex = 0;
  ttsState.nodesToRead = [];
  ttsState.currentSpeechId = null;
  ttsState.isConfigDirty = false;
}
async function loadVoices(): Promise<void> {
  // This logic remains the same
}
function speakNodeAtIndex(index: number): void {
  const { nodesToRead, selectedVoiceId, rate, volume } = ttsState;
  if (index >= nodesToRead.length) {
    toast.success(getStoreValue(t)('tts.finished_reading_toast'));
    transitionToIdle();
    return;
  }
  const node = nodesToRead[index];
  const text = (node.text || (node as any).textToSpeak || '').trim();
  if (!text) {
    nextNode();
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
      ttsState.status === 'playing' &&
      ttsState.currentSpeechId === speechId
    ) {
      nextNode();
    }
  };
  utterance.onerror = (e) => {
    if (ttsState.currentSpeechId === speechId) {
      ttsState.status = 'error';
      ttsState.error = getStoreValue(t)('tts.playback_error');
    }
  };

  ttsState.currentNodeIndex = index;
  ttsState.status = 'playing';
  ttsState.currentSpeechId = speechId;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// --- Public Action Functions ---

/**
 * Initializes the TTS system and its reactive effects.
 * This function should be called once from the root layout.
 */
export function initialize(): void {
  if (ttsState.isInitialized || !browser) return;
  ttsState.isInitialized = true;
  ttsState.status = 'initializing';

  loadVoices().then(() => {
    ttsState.status = 'idle';
    ttsState.isServiceReady = true;
  });

  // This effect creates the decoration for the currently speaking node.
  $effect(() => {
    // --- VVVV THIS IS THE FIX (2/2): Access the reactive state directly. VVVV ---
    const { instance: editor } = editorState;
    const { status, nodesToRead, currentNodeIndex } = ttsState;

    if (
      !editor ||
      !['playing', 'paused'].includes(status) ||
      nodesToRead.length === 0
    ) {
      if (ttsState.decorationSet.find().length > 0) {
        ttsState.decorationSet = DecorationSet.empty;
      }
      return;
    }

    const currentNode = nodesToRead[currentNodeIndex];
    if (currentNode && currentNode.pos !== undefined && currentNode.node) {
      const deco = Decoration.node(
        currentNode.pos,
        currentNode.pos + currentNode.node.nodeSize,
        { class: 'is-current-tts-node' }
      );
      ttsState.decorationSet = DecorationSet.create(editor.state.doc, [deco]);
    } else {
      ttsState.decorationSet = DecorationSet.empty;
    }
  });
}

export function startReading(nodes: TTS.ReadableNode[]): void {
  if (!ttsState.isInitialized) initialize();
  transitionToIdle();
  if (nodes.length === 0) {
    toast.info(getStoreValue(t)('tts.no_readable_content_toast'));
    return;
  }
  ttsState.nodesToRead = nodes;
  speakNodeAtIndex(0);
}

export const stopReading = transitionToIdle;

export function pauseReading(): void {
  if (ttsState.status === 'playing') {
    window.speechSynthesis.pause();
    ttsState.status = 'paused';
  }
}

export function resumeReading(): void {
  if (ttsState.status !== 'paused') return;
  if (ttsState.isConfigDirty) {
    ttsState.isConfigDirty = false;
    speakNodeAtIndex(ttsState.currentNodeIndex);
  } else {
    window.speechSynthesis.resume();
    ttsState.status = 'playing';
  }
}

function handleSettingChange(updateFn: () => void, toastMessage: string) {
  updateFn();
  if (['playing', 'paused'].includes(ttsState.status)) {
    ttsState.isConfigDirty = true;
    if (ttsState.status === 'playing') pauseReading();
    toast.info(toastMessage);
  }
}

export function setVoice(voiceId: string): void {
  handleSettingChange(
    () => (ttsState.selectedVoiceId = voiceId),
    getStoreValue(t)('tts.voice_changed_toast')
  );
}
export function setRate(newRate: number): void {
  handleSettingChange(
    () => (ttsState.rate = newRate),
    getStoreValue(t)('tts.speed_changed_toast')
  );
}
export function setVolume(newVolume: number): void {
  handleSettingChange(
    () => (ttsState.volume = newVolume),
    getStoreValue(t)('tts.volume_changed_toast')
  );
}

export function nextNode(): void {
  speakNodeAtIndex(ttsState.currentNodeIndex + 1);
}

export function previousNode(): void {
  if (ttsState.currentNodeIndex > 0) {
    speakNodeAtIndex(ttsState.currentNodeIndex - 1);
  }
}

export function replay(): void {
  const currentNodes = [...ttsState.nodesToRead];
  if (currentNodes.length > 0) {
    transitionToIdle();
    setTimeout(() => startReading(currentNodes), 50);
  }
}
