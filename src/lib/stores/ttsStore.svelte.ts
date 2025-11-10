/**
 * @file Manages Text-to-Speech (TTS) playback using Svelte 5 Runes and the Web Speech API.
 * This store holds the state for TTS, including node/word-level tracking for editor
 * highlighting and persistent, section-based highlighting for the tree visualization.
 */
import { browser } from '$app/environment';
import { toast } from 'svelte-sonner';
import { get as getStoreValue } from 'svelte/store';
import { t } from '$lib/utils/i18n';
import type { TTS } from '$lib/types';

// --- State Definition ---

export interface TTSState {
  status: TTS.Status;
  nodesToRead: TTS.ReadableNode[];
  currentNodeIndex: number;
  availableVoices: TTS.Voice[];
  selectedVoiceId: string | null;
  rate: number;
  volume: number;
  error: string | null;
  isInitialized: boolean;
  isConfigDirty: boolean;
  isServiceReady: boolean;
  currentSpeechId: string | null;
  currentWordRange: { from: number; to: number } | null;
  activeTreeNodeId: string | null; // Tracks the ID of the tree node being narrated
}

const initialState: TTSState = {
  status: 'idle',
  nodesToRead: [],
  currentNodeIndex: 0,
  availableVoices: [],
  selectedVoiceId: null,
  rate: 1,
  volume: 1,
  error: null,
  isInitialized: false,
  isConfigDirty: false,
  isServiceReady: false,
  currentSpeechId: null,
  currentWordRange: null,
  activeTreeNodeId: null, // Initialize as null
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
  ttsState.currentWordRange = null;
  ttsState.activeTreeNodeId = null; // Reset the active tree node ID
  ttsState.isConfigDirty = false;
}

async function loadVoices(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!browser || !('speechSynthesis' in window)) {
      ttsState.error = getStoreValue(t)('tts.not_supported');
      ttsState.status = 'error';
      return reject(new Error('Speech Synthesis not supported.'));
    }

    const populateVoiceList = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const mappedVoices: TTS.Voice[] = voices.map((v) => ({
          id: v.voiceURI,
          name: `${v.name} (${v.lang})`,
          lang: v.lang,
        }));
        ttsState.availableVoices = mappedVoices;
        const voiceExists = mappedVoices.some(
          (v) => v.id === ttsState.selectedVoiceId
        );
        if (!ttsState.selectedVoiceId || !voiceExists) {
          const defaultVoice =
            mappedVoices.find(
              (v) => v.lang.includes('en') && v.id.includes('local')
            ) ||
            mappedVoices.find((v) => v.lang.includes('en')) ||
            mappedVoices[0];
          if (defaultVoice) {
            ttsState.selectedVoiceId = defaultVoice.id;
          }
        }
        resolve();
      }
    };

    populateVoiceList();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
  });
}

function speakNodeAtIndex(index: number): void {
  const { nodesToRead, selectedVoiceId, rate, volume } = ttsState;
  if (index >= nodesToRead.length) {
    toast.success(getStoreValue(t)('tts.finished_reading_toast'));
    transitionToIdle();
    return;
  }

  // Clear previous word highlight when moving to a new node.
  ttsState.currentWordRange = null;

  const node = nodesToRead[index];
  const text = (node.text || '').trim();

  // --- FINAL, SIMPLIFIED LOGIC FOR PERSISTENT HIGHLIGHT ---
  // The active tree node is ALWAYS the parent heading ID of the current node
  // being read (whether it's a heading or a paragraph). This is provided
  // by our intelligent `getReadableNodes` function.
  ttsState.activeTreeNodeId = node.parentHeadingId ?? null;

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

  utterance.onboundary = (event) => {
    if (
      event.name !== 'word' ||
      ttsState.status !== 'playing' ||
      ttsState.currentSpeechId !== speechId
    ) {
      return;
    }
    const charIndex = event.charIndex;
    let charEnd = text.substring(charIndex).search(/[\s.,;!?\n\r]/);
    if (charEnd === -1) {
      charEnd = text.length;
    } else {
      charEnd += charIndex;
    }
    if (node.pos >= 0) {
      // Only calculate for valid ProseMirror nodes
      const from = node.pos + 1 + charIndex;
      const to = node.pos + 1 + charEnd;
      ttsState.currentWordRange = { from, to };
    }
  };

  utterance.onend = () => {
    ttsState.currentWordRange = null;
    if (
      ttsState.status === 'playing' &&
      ttsState.currentSpeechId === speechId
    ) {
      nextNode();
    }
  };

  utterance.onerror = () => {
    ttsState.currentWordRange = null;
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
 * Initializes the TTS system by loading voices.
 * This should be called once from a root component.
 */
export function initialize(): void {
  if (ttsState.isInitialized || !browser) return;
  ttsState.isInitialized = true;
  ttsState.status = 'initializing';

  loadVoices()
    .then(() => {
      ttsState.status = 'idle';
      ttsState.isServiceReady = true;
    })
    .catch((error) => {
      console.error('TTS Initialization failed:', error);
    });
}

export function startReading(nodes: TTS.ReadableNode[]): void {
  if (!ttsState.isInitialized) {
    initialize();
  }
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
