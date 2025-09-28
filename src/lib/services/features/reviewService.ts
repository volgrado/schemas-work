import type { DomainCard } from '$lib/types';

// Calidad de la respuesta del usuario (0=fallo, 3=dudoso, 5=perfecto)
type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

// Un día en milisegundos
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calcula el siguiente estado de una tarjeta de estudio basándose en la calidad de la respuesta.
 * Implementa una versión del algoritmo SM-2.
 * @param card La tarjeta que se está repasando.
 * @param quality La calidad de la respuesta del usuario (0-5).
 * @returns La tarjeta con sus datos de revisión actualizados.
 */
export function calculateNextReview(
  card: DomainCard,
  quality: ReviewQuality
): DomainCard {
  // 1. Proporcionar valores por defecto para tarjetas nuevas
  const easeFactor = card.easeFactor ?? 2.5;
  const interval = card.interval ?? 0;
  const repetitions = card.repetitions ?? 0;

  // 2. Si la respuesta es incorrecta (calidad < 3), se reinicia el progreso
  if (quality < 3) {
    return {
      ...card,
      repetitions: 0,
      interval: 1,
      easeFactor: Math.max(1.3, easeFactor - 0.2), // Reducimos la facilidad pero no por debajo de 1.3
      dueDate: Date.now() + ONE_DAY_MS,
    };
  }

  // 3. Si la respuesta es correcta (calidad >= 3)
  let newInterval: number;
  let newRepetitions: number;

  if (repetitions === 0) {
    newInterval = 1;
    newRepetitions = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
    newRepetitions = 2;
  } else {
    newInterval = Math.round(interval * easeFactor);
    newRepetitions = repetitions + 1;
  }

  // 4. Calcular el nuevo factor de facilidad
  const newEaseFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // 5. Devolver la tarjeta actualizada
  return {
    ...card,
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Math.max(1.3, newEaseFactor), // La facilidad nunca baja de 1.3
    dueDate: Date.now() + newInterval * ONE_DAY_MS,
  };
}
