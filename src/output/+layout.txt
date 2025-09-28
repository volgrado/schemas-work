// src/routes/+layout.ts

import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';

/**
 * La clave única en localStorage utilizada para recordar si el usuario ya ha
 * visto y superado la pantalla de bienvenida.
 */
const WELCOME_KEY = 'schemas-work-has-seen-welcome';

export const ssr = false;

/**
 * La función `load` de SvelteKit se ejecuta en el servidor y/o en el cliente
 * antes de que el componente `+layout.svelte` se renderice. Su propósito es
 * proporcionar datos al layout y a todas las páginas anidadas.
 *
 * En este caso, su única responsabilidad es comprobar si es la primera visita
 * del usuario para decidir si se debe mostrar la pantalla de onboarding.
 */
export const load: LayoutLoad = () => {
  let showWelcome = false;

  // Esta lógica solo puede ejecutarse en el navegador, donde localStorage
  // está disponible. Durante el renderizado en servidor (SSR), `browser` es `false`.
  if (browser) {
    // Si NO se encuentra la clave en localStorage, significa que el usuario
    // nunca ha hecho clic en el botón "Comenzar" de la pantalla de bienvenida.
    if (!localStorage.getItem(WELCOME_KEY)) {
      showWelcome = true;
    }
  }

  // El objeto devuelto aquí estará disponible en `+layout.svelte` y `+page.svelte`
  // a través de la prop `export let data`.
  return {
    showWelcome,
  };
};
