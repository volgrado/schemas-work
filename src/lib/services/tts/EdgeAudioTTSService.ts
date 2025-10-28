// src/lib/services/tts/EdgeAudioTTSService.ts

import type { TTSService, TTSSpeakOptions, TTSVoice } from './tts.service';
import { getAudio } from '$lib/services/core/db.service';

export class EdgeAudioTTSService implements TTSService {
  private audio: HTMLAudioElement;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  private currentAudioUrl: string | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;

  // --- FIX 1: Create a stable event handler to prevent type errors and memory leaks ---
  private handleEnded = () => this.onEndCallback?.();

  constructor() {
    this.audio = new Audio();
    this.audio.setAttribute('playsinline', '');

    this.audio.addEventListener('error', (e) => {
      const mediaError = this.audio.error;
      const errorMessage = mediaError
        ? `Media Error Code ${mediaError.code}: ${mediaError.message}`
        : 'Audio playback failed.';
      this.onErrorCallback?.(new Error(errorMessage));
    });
  }

  public initialize(): Promise<void> {
    return Promise.resolve();
  }

  public getVoices(): TTSVoice[] {
    return [
      { id: 'en-US-JennyNeural', name: 'Jenny (English, US)', lang: 'en-US' },
      { id: 'en-GB-SoniaNeural', name: 'Sonia (English, UK)', lang: 'en-GB' },
      {
        id: 'es-MX-DaliaNeural',
        name: 'Dalia (Español, México)',
        lang: 'es-MX',
      },
      { id: 'fr-FR-DeniseNeural', name: 'Denise (Français)', lang: 'fr-FR' },
    ];
  }

  public speak(
    text: string,
    options: TTSSpeakOptions & { audioId?: string }
  ): void {
    this.cancel();

    this.onEndCallback = options.onEnd;
    this.onErrorCallback = options.onError;

    (async () => {
      try {
        if (options.audioId) {
          const audioBlob = await getAudio(options.audioId);
          if (audioBlob) {
            console.log('Playing audio from: Cache');
            this.currentAudioUrl = URL.createObjectURL(audioBlob);
            this.audio.src = this.currentAudioUrl;
            this.audio.playbackRate = options.rate;
            // --- FIX 1 (continued): Use the stable handler ---
            this.audio.addEventListener('ended', this.handleEnded, {
              once: true,
            });
            await this.audio.play();
            return;
          }
        }

        console.log('Playing audio from: Network (Streaming)');
        const encodedText = encodeURIComponent(text);
        const response = await fetch(
          `/api/tts?text=${encodedText}&voice=${options.voiceId}`
        );

        if (!response.ok || !response.body) {
          throw new Error(`TTS API Error (Status ${response.status})`);
        }

        this.mediaSource = new MediaSource();
        this.currentAudioUrl = URL.createObjectURL(this.mediaSource);
        this.audio.src = this.currentAudioUrl;
        this.audio.playbackRate = options.rate;

        this.mediaSource.addEventListener(
          'sourceopen',
          async () => {
            if (!this.mediaSource) return;
            try {
              const mimeType = 'audio/mpeg';
              this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);

              const reader = response.body!.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                // --- FIX 2: Explicitly provide the underlying ArrayBuffer ---
                // This resolves the 'BufferSource' type mismatch.
                await this.appendBuffer(value.buffer);
              }

              if (this.mediaSource.readyState === 'open') {
                this.mediaSource.endOfStream();
              }
            } catch (error) {
              this.onErrorCallback?.(error);
            }
          },
          { once: true }
        );

        // --- FIX 1 (continued): Use the stable handler ---
        this.audio.addEventListener('ended', this.handleEnded, { once: true });

        await this.audio.play();
      } catch (error) {
        this.onErrorCallback?.(error);
      }
    })();
  }

  // --- FIX 2 (continued): Update the parameter type to ArrayBuffer ---
  private appendBuffer(chunk: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.sourceBuffer || this.sourceBuffer.updating) {
        reject('SourceBuffer not available or busy.');
        return;
      }
      const onUpdateEnd = () => {
        this.sourceBuffer?.removeEventListener('updateend', onUpdateEnd);
        this.sourceBuffer?.removeEventListener('error', onError);
        resolve();
      };
      const onError = (ev: Event) => {
        this.sourceBuffer?.removeEventListener('updateend', onUpdateEnd);
        this.sourceBuffer?.removeEventListener('error', onError);
        reject(ev);
      };

      this.sourceBuffer.addEventListener('updateend', onUpdateEnd);
      this.sourceBuffer.addEventListener('error', onError);
      this.sourceBuffer.appendBuffer(chunk);
    });
  }

  public pause(): void {
    this.audio.pause();
  }

  public resume(): void {
    this.audio.play().catch(this.onErrorCallback);
  }

  public cancel(): void {
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      this.sourceBuffer?.abort();
      this.mediaSource.endOfStream();
    }

    this.audio.pause();
    this.audio.removeAttribute('src');

    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }

    this.currentAudioUrl = null;
    this.mediaSource = null;
    this.sourceBuffer = null;

    // --- FIX 1 (continued): Remove the correct handler to prevent memory leaks ---
    this.audio.removeEventListener('ended', this.handleEnded);
  }
}
