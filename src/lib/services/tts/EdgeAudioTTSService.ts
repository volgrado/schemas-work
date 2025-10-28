// src/lib/services/tts/EdgeAudioTTSService.ts (Complete)

/**
 * @file Implements the TTSService interface using a custom backend API that streams
 * audio from a service like Microsoft Edge's TTS.
 * @module EdgeAudioTTSService
 */

import type { TTSService, TTSSpeakOptions, TTSVoice } from './tts.service';
import { getAudio } from '$lib/services/core/db.service';

export class EdgeAudioTTSService implements TTSService {
  private audio: HTMLAudioElement;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  private currentAudioUrl: string | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;

  private handleEnded = () => this.onEndCallback?.();

  constructor() {
    this.audio = new Audio();
    this.audio.setAttribute('playsinline', '');

    this.audio.addEventListener('error', () => {
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
              // --- THIS IS THE FINAL CLIENT-SIDE CHANGE ---
              // We declare the modern, supported MIME type.
              const mimeType = 'audio/webm; codecs=opus';
              // --- END OF CHANGE ---

              // We should check if the browser supports it before trying to use it.
              if (!MediaSource.isTypeSupported(mimeType)) {
                throw new Error(
                  `Streaming with ${mimeType} is not supported by this browser.`
                );
              }
              this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);

              const streamFinished = new Promise<void>((resolve) => {
                const onUpdateEnd = () => {
                  if (
                    this.mediaSource?.readyState === 'open' &&
                    !this.sourceBuffer?.updating
                  ) {
                    this.mediaSource.endOfStream();
                  }
                };
                const onSourceEnded = () => {
                  if (this.sourceBuffer) {
                    this.sourceBuffer.removeEventListener(
                      'updateend',
                      onUpdateEnd
                    );
                  }
                  if (this.mediaSource) {
                    this.mediaSource.removeEventListener(
                      'sourceended',
                      onSourceEnded
                    );
                  }
                  resolve();
                };
                if (this.sourceBuffer) {
                  this.sourceBuffer.addEventListener('updateend', onUpdateEnd);
                }
                if (this.mediaSource) {
                  this.mediaSource.addEventListener(
                    'sourceended',
                    onSourceEnded
                  );
                }
              });

              const reader = response.body!.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await this.appendBuffer(value.buffer);
              }
              await streamFinished;
            } catch (error) {
              this.onErrorCallback?.(error);
            }
          },
          { once: true }
        );

        this.audio.addEventListener('ended', this.handleEnded, { once: true });
        await this.audio.play();
      } catch (error) {
        this.onErrorCallback?.(error);
      }
    })();
  }

  private appendBuffer(chunk: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const buffer = this.sourceBuffer;
      if (!buffer) {
        return reject('SourceBuffer is not initialized.');
      }
      const append = () => {
        try {
          const onUpdateEnd = () => {
            buffer.removeEventListener('updateend', onUpdateEnd);
            buffer.removeEventListener('error', onError);
            resolve();
          };
          const onError = (ev: Event) => {
            buffer.removeEventListener('updateend', onUpdateEnd);
            buffer.removeEventListener('error', onError);
            reject(ev);
          };
          buffer.addEventListener('updateend', onUpdateEnd);
          buffer.addEventListener('error', onError);
          buffer.appendBuffer(chunk);
        } catch (err) {
          reject(err);
        }
      };
      if (buffer.updating) {
        buffer.addEventListener('updateend', append, { once: true });
      } else {
        append();
      }
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
      try {
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
          this.sourceBuffer.abort();
        }
        if (this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
      } catch (e) {
        console.error('Error during MediaSource cancellation:', e);
      }
    }
    this.audio.pause();
    this.audio.removeAttribute('src');
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }
    this.currentAudioUrl = null;
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.audio.removeEventListener('ended', this.handleEnded);
  }
}
