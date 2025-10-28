// src/lib/services/tts/EdgeAudioTTSService.ts

import type { TTSService, TTSSpeakOptions, TTSVoice } from './tts.service';
import { getAudio } from '$lib/services/core/db.service'; // Importa la función para leer de la BD

export class EdgeAudioTTSService implements TTSService {
  private audio: HTMLAudioElement;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  private currentAudioUrl: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.setAttribute('playsinline', ''); // Importante para iOS

    this.audio.addEventListener('ended', () => this.onEndCallback?.());
    this.audio.addEventListener('error', (e) =>
      this.onErrorCallback?.(new Error('Audio playback failed.'))
    );
  }

  public initialize(): Promise<void> {
    return Promise.resolve();
  }

  public getVoices(): TTSVoice[] {
    // Lista de voces de alta calidad que ofreces a tus usuarios.
    return [
      { id: 'en-US-JennyNeural', name: 'Jenny (English, US)', lang: 'en-US' },
      { id: 'en-GB-SoniaNeural', name: 'Sonia (English, UK)', lang: 'en-GB' },
      {
        id: 'es-MX-DaliaNeural',
        name: 'Dalia (Español, México)',
        lang: 'es-MX',
      },
      { id: 'fr-FR-DeniseNeural', name: 'Denise (Français)', lang: 'fr-FR' },
      // Puedes añadir más voces de la lista de Edge TTS aquí
    ];
  }

  /**
   * Inicia la reproducción de audio.
   * Primero intenta obtener el audio desde el almacenamiento local (IndexedDB) si se proporciona un `audioId`.
   * Si no lo encuentra localmente, lo solicita a la API de red.
   * @param text El texto a sintetizar (solo se usa si el audio no está en caché).
   * @param options Opciones de reproducción, incluyendo un `audioId` opcional para la búsqueda en caché.
   */
  public speak(
    text: string,
    options: TTSSpeakOptions & { audioId?: string }
  ): void {
    this.cancel(); // Detiene cualquier reproducción anterior

    this.onEndCallback = options.onEnd;
    this.onErrorCallback = options.onError;

    // Usamos una función autoejecutable asíncrona para manejar las promesas limpiamente.
    (async () => {
      try {
        let audioBlob: Blob | undefined;
        let dataSource: 'Cache' | 'Network' = 'Network';

        // --- INICIO DE LA LÓGICA OFFLINE ---
        // Si nos han pasado un ID, intentamos buscar el audio en la base de datos local.
        if (options.audioId) {
          audioBlob = await getAudio(options.audioId);
          if (audioBlob) {
            dataSource = 'Cache';
          }
        }

        // Si no encontramos el audio en la caché (o no se proporcionó un ID), lo pedimos a la red.
        if (!audioBlob) {
          dataSource = 'Network';
          const encodedText = encodeURIComponent(text);
          const response = await fetch(
            `/api/tts?text=${encodedText}&voice=${options.voiceId}`
          );

          if (!response.ok) {
            throw new Error(
              `TTS service failed with status ${response.status}`
            );
          }
          audioBlob = await response.blob();
        }
        // --- FIN DE LA LÓGICA OFFLINE ---

        console.log(`Playing audio from: ${dataSource}`); // Log útil para depurar

        if (!audioBlob || audioBlob.size === 0) {
          throw new Error('Audio Blob is empty or invalid.');
        }

        // Creamos una URL local para el Blob (ya sea de la caché o de la red)
        this.currentAudioUrl = URL.createObjectURL(audioBlob);
        this.audio.src = this.currentAudioUrl;
        this.audio.playbackRate = options.rate;

        // Reproducimos el audio
        await this.audio.play();
      } catch (error) {
        // Si algo falla en cualquier punto, llamamos al callback de error.
        this.onErrorCallback?.(error);
      }
    })();
  }

  public pause(): void {
    this.audio.pause();
  }

  public resume(): void {
    this.audio.play();
  }

  public cancel(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    // Es muy importante liberar la memoria de la URL del Blob cuando ya no se necesita.
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
  }
}
