// src/lib/utils/prng.ts

/**
 * Creates a simple Mulberry32 pseudo-random number generator.
 * @param seed A number used to initialize the generator.
 * @returns A function that, when called, returns the next pseudo-random number between 0 and 1.
 */
export function mulberry32(seed: number) {
  return function () {
    // This algorithm generates a predictable sequence of numbers based on the seed.
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
