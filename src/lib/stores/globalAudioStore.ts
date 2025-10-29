// src/lib/stores/globalAudioStore.ts
import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

export const globalAudioElementStore: Writable<HTMLAudioElement | null> =
  writable(null);
