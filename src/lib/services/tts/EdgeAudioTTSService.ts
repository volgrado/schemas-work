/**
 * @file Implements the TTSService interface using a custom backend API that streams
 * audio. This final version is architected as a pure class that operates on a
 * provided HTMLAudioElement, making it decoupled from Svelte's lifecycle and context.
 * @module EdgeAudioTTSService
 */

import type { TTSService, TTSSpeakOptions, TTSVoice } from './tts.service';
import { getAudio } from '$lib/services/core/db.service';

// NOTE: Remote logging can be removed for production.
function sendLogToServer(
  level: 'info' | 'error' | 'fatal',
  message: string,
  data?: any
) {
  try {
    const logData = {
      level,
      message,
      data: data
        ? JSON.stringify(data, (key, value) =>
            value instanceof Error
              ? { message: value.message, stack: value.stack }
              : value
          )
        : undefined,
    };
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
      keepalive: true,
    }).catch(console.error);
  } catch (e) {
    console.error('Failed to send log to server:', e);
  }
}

export class EdgeAudioTTSService implements TTSService {
  private audio: HTMLAudioElement;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  private currentAudioUrl: string | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;

  // Stable event handlers to ensure proper removal and prevent memory leaks.
  private handleEnded = () => {
    this.log('EVENT: Audio element "ended" triggered.');
    this.onEndCallback?.();
  };
  private handleError = () => {
    const mediaError = this.audio.error;
    const errorMessage = mediaError
      ? `Media Error Code ${mediaError.code}: ${mediaError.message}`
      : 'Audio playback failed.';
    this.logError('EVENT: Audio element "error" triggered', {
      code: mediaError?.code,
      message: mediaError?.message,
    });
    this.onErrorCallback?.(new Error(errorMessage));
  };

  private log(message: string, data?: any) {
    const fullMessage = `[EdgeAudioTTSService] ${message}`;
    console.log(fullMessage, data || '');
    sendLogToServer('info', message, data);
  }
  private logError(message: string, error: any) {
    const fullMessage = `[EdgeAudioTTSService] ${message}`;
    console.error(fullMessage, error);
    sendLogToServer('error', message, error);
  }

  constructor(audioElement: HTMLAudioElement) {
    if (!audioElement) {
      throw new Error(
        'EdgeAudioTTSService: An HTMLAudioElement must be provided to the constructor.'
      );
    }
    this.audio = audioElement;
    this.log('Service initialized with global audio element.');
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
    this.log('speak() called.');
    this.cancel();
    this.onEndCallback = options.onEnd;
    this.onErrorCallback = options.onError;

    // Add event listeners for this specific operation. They will be removed in cancel().
    this.audio.addEventListener('error', this.handleError, { once: true });
    this.audio.addEventListener('ended', this.handleEnded, { once: true });

    (async () => {
      try {
        if (options.audioId) {
          const audioBlob = await getAudio(options.audioId);
          if (audioBlob) {
            this.log('SUCCESS: Found audio in cache.');
            this.currentAudioUrl = URL.createObjectURL(audioBlob);
            this.audio.src = this.currentAudioUrl;
            this.audio.playbackRate = options.rate;
            await this.audio.play();
            return;
          }
        }

        this.mediaSource = new MediaSource();
        this.currentAudioUrl = URL.createObjectURL(this.mediaSource);
        this.audio.src = this.currentAudioUrl;
        this.audio.playbackRate = options.rate;

        this.mediaSource.addEventListener(
          'sourceopen',
          async () => {
            this.log('EVENT: MediaSource "sourceopen" triggered.');
            if (!this.mediaSource) return;
            try {
              const encodedText = encodeURIComponent(text);
              const fetchUrl = `/api/tts?text=${encodedText}&voice=${options.voiceId}`;
              const response = await fetch(fetchUrl);
              if (!response.ok || !response.body) {
                throw new Error(`TTS API Error (Status ${response.status})`);
              }

              const mimeType = 'audio/webm; codecs=opus';
              if (!MediaSource.isTypeSupported(mimeType)) {
                throw new Error(`Streaming with ${mimeType} is not supported.`);
              }
              this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);

              // Play is now called here, after the source is open and ready.
              await this.audio.play();

              const streamFinished = new Promise<void>((resolve) => {
                if (this.mediaSource) {
                  this.mediaSource.addEventListener(
                    'sourceended',
                    () => resolve(),
                    { once: true }
                  );
                } else {
                  resolve();
                }
              });

              const reader = response.body!.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await this.appendBuffer(value.buffer);
              }

              const waitForUpdateEndAndClose = () => {
                if (this.sourceBuffer && !this.sourceBuffer.updating) {
                  if (this.mediaSource?.readyState === 'open') {
                    this.mediaSource.endOfStream();
                  }
                } else {
                  this.sourceBuffer?.addEventListener(
                    'updateend',
                    waitForUpdateEndAndClose,
                    { once: true }
                  );
                }
              };
              waitForUpdateEndAndClose();
              await streamFinished;
            } catch (error) {
              this.logError('FATAL ERROR inside sourceopen handler:', error);
              this.onErrorCallback?.(error);
            }
          },
          { once: true }
        );
      } catch (error) {
        this.logError('FATAL ERROR in main speak() async block:', error);
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
    this.log('pause() called.');
    this.audio.pause();
  }

  public resume(): void {
    this.log('resume() called.');
    this.audio.play().catch(this.onErrorCallback);
  }

  public cancel(): void {
    this.log('cancel() called.');

    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
          this.sourceBuffer.abort();
        }
        if (this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
      } catch (e) {
        this.logError('Error during MediaSource cancellation:', e);
      }
    }

    this.audio.pause();
    if (this.currentAudioUrl) {
      this.audio.removeAttribute('src');
      URL.revokeObjectURL(this.currentAudioUrl);
    }

    this.currentAudioUrl = null;
    this.mediaSource = null;
    this.sourceBuffer = null;

    // Clean up the listeners we added for this operation
    this.audio.removeEventListener('ended', this.handleEnded);
    this.audio.removeEventListener('error', this.handleError);

    this.log('Cancellation complete.');
  }
}
