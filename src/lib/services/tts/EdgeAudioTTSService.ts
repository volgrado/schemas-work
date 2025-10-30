/**
 * @file Implements the TTSService interface to play pre-downloaded audio chunks.
 * This service operates on a provided HTMLAudioElement and is designed to play
 * audio blobs fetched from a local cache (IndexedDB). It does not perform
 * any network requests for audio synthesis.
 * @module EdgeAudioTTSService
 */

import type { TTSService, TTSSpeakOptions, TTSVoice } from './ttsService';
import { getAudio } from '$lib/services/core/db.service';

/** Defines the possible operational states of the service. */
type ServiceStatus = 'idle' | 'playing' | 'paused';

export class EdgeAudioTTSService implements TTSService {
  private readonly audio: HTMLAudioElement;
  private status: ServiceStatus = 'idle';

  // --- Propiedades de estado simplificadas ---
  private availableVoices: TTSVoice[] = [];
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private currentAudioUrl: string | null = null;

  // --- Handlers de eventos estables ---
  private handleEnded = () => {
    this.log('EVENT: Audio element "ended" triggered.');
    this.onEndCallback?.();
    this.resetState();
  };

  private handleError = (error: unknown, context: string) => {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logError(`ERROR during [${context}]`, err);
    this.onErrorCallback?.(err);
    this.resetState();
  };

  // --- Logging simplificado (sin llamadas al servidor) ---
  private log(message: string, data?: any) {
    console.log(`[EdgeAudioTTSService] ${message}`, data || '');
  }
  private logError(message: string, error: any) {
    console.error(`[EdgeAudioTTSService] ${message}`, error);
  }

  constructor(audioElement: HTMLAudioElement) {
    if (!audioElement) {
      throw new Error(
        'EdgeAudioTTSService: An HTMLAudioElement must be provided.'
      );
    }
    this.audio = audioElement;
    this.log('Service instantiated. Call initialize() to make it ready.');
  }

  private resetState(): void {
    this.log('Resetting service state.');

    this.audio.removeEventListener('ended', this.handleEnded);
    this.audio.removeEventListener('error', (e) =>
      this.handleError(e, 'HTMLAudioElement internal error')
    );

    this.audio.pause();
    this.audio.removeAttribute('src');
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }

    this.status = 'idle';
    this.onEndCallback = null;
    this.onErrorCallback = null;
    this.currentAudioUrl = null;
  }

  public async initialize(): Promise<void> {
    if (this.availableVoices.length > 0) return;

    try {
      this.log('Initializing service by fetching voices from /voices.json...');
      const response = await fetch('/voices.json');
      if (!response.ok) {
        throw new Error(
          `Failed to fetch voices.json: Status ${response.status}`
        );
      }
      this.availableVoices = await response.json();
      this.log(`Successfully loaded ${this.availableVoices.length} voices.`);
    } catch (error) {
      this.logError('FATAL: Could not initialize TTSService', error);
      throw error;
    }
  }

  public getVoices(): TTSVoice[] {
    if (this.availableVoices.length === 0) {
      console.warn('getVoices() called before initialize() was completed.');
    }
    return this.availableVoices;
  }

  /**
   * Finds a pre-downloaded audio chunk by its ID and plays it.
   * Throws an error if the audio chunk is not found in the cache.
   */
  public async speak(
    text: string, // 'text' ya no se usa, pero lo mantenemos para cumplir la interfaz
    options: TTSSpeakOptions & { audioId?: string }
  ): Promise<void> {
    if (this.availableVoices.length === 0) {
      throw new Error(
        'TTS Service has not been initialized. Call initialize() first.'
      );
    }

    this.log(`speak() called for audioId: "${options.audioId}"`);
    this.resetState();

    this.onEndCallback = options.onEnd;
    this.onErrorCallback = options.onError;

    this.audio.addEventListener('ended', this.handleEnded, { once: true });
    this.audio.addEventListener(
      'error',
      (e) => this.handleError(e, 'HTMLAudioElement internal error'),
      { once: true }
    );

    try {
      if (!options.audioId) {
        throw new Error('audioId is required for playback in this service.');
      }

      const audioBlob = await getAudio(options.audioId);
      if (!audioBlob) {
        // Esto es un error de lógica en la aplicación, el audio debería existir.
        throw new Error(
          `Audio chunk not found in cache for id: ${options.audioId}. The document might need to be re-downloaded.`
        );
      }

      this.log('SUCCESS: Found audio in cache.');
      this.currentAudioUrl = URL.createObjectURL(audioBlob);
      this.audio.src = this.currentAudioUrl;
      this.audio.playbackRate = options.rate;
      await this.audio.play();
      this.status = 'playing';
    } catch (error) {
      this.handleError(error, 'speak setup');
      throw error;
    }
  }

  public pause(): void {
    if (this.status === 'playing') {
      this.log('pause() called.');
      this.audio.pause();
      this.status = 'paused';
    } else {
      this.log(`WARN: pause() called in invalid state: ${this.status}`);
    }
  }

  public resume(): void {
    if (this.status === 'paused') {
      this.log('resume() called.');
      this.audio
        .play()
        .then(() => {
          this.status = 'playing';
        })
        .catch((e) => this.handleError(e, 'resume playback'));
    } else {
      this.log(`WARN: resume() called in invalid state: ${this.status}`);
    }
  }

  public cancel(): void {
    this.log('cancel() called.');
    this.resetState();
  }

  // --- MÉTODOS ELIMINADOS ---
  // private streamFromApi(...) ya no existe.
  // private appendBuffer(...) ya no existe.
}
