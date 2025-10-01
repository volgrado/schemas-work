// src/lib/utils/debounce.ts

/**
 * Crea una versión "debounced" de una función. La función debounced solo se ejecutará
 * después de que haya pasado un cierto tiempo `delay` sin que haya sido llamada de nuevo.
 *
 * @param func La función a la que se le aplicará el debounce.
 * @param delay El tiempo de espera en milisegundos.
 * @returns Una nueva función con el comportamiento de debounce.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;

  return function (this: any, ...args: Parameters<T>) {
    // Si se llama de nuevo, se cancela el temporizador anterior.
    clearTimeout(timeoutId);

    // Se establece un nuevo temporizador.
    timeoutId = window.setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
