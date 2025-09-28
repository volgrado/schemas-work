// src/lib/services/ai/aiService.ts

import type { AISchemaResponse } from '$lib/types';
// Descomentar cuando se implemente la API real.
// import { CREATE_SCHEMA_FROM_TEXT_PROMPT } from './prompts';

/**
 * Este servicio abstrae las interacciones con la API de Inteligencia Artificial.
 * Actualmente, utiliza datos mockeados para simular respuestas y permitir
 * el desarrollo de la UI sin una implementación de backend real.
 */

/**
 * Simula una llamada a una API de IA para convertir texto en un esquema estructurado.
 *
 * @param text - El texto de entrada del usuario.
 * @returns Una promesa que se resuelve con la estructura del esquema generada.
 */
export async function createSchemaFromText(
  text: string
): Promise<AISchemaResponse> {
  console.log('Simulando llamada a la API de IA con el texto:', text);

  // --- MOCK IMPLEMENTATION ---
  // Simulamos una demora de red para poder probar los estados de carga en la UI.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Devolvemos una estructura de datos predefinida que sigue la interfaz `AISchemaResponse`.
  const mockResponse: AISchemaResponse = {
    title: 'Conceptos Clave de la Fotosíntesis',
    nodes: [
      {
        content: 'Definición',
        children: [
          { content: 'Proceso de conversión de luz en energía química.' },
          { content: 'Realizado por plantas, algas y algunas bacterias.' },
        ],
      },
      {
        content: 'Reactivos Necesarios',
        children: [
          { content: 'Dióxido de Carbono (CO2)' },
          { content: 'Agua (H2O)' },
          { content: 'Luz Solar' },
        ],
      },
      {
        content: 'Productos Resultantes',
        children: [
          { content: 'Glucosa (C6H12O6)' },
          { content: 'Oxígeno (O2)' },
        ],
      },
      {
        content: 'Fases del Proceso',
        children: [
          { content: 'Fase Luminosa (dependiente de la luz)' },
          { content: 'Fase Oscura (Ciclo de Calvin)' },
        ],
      },
    ],
  };

  console.log('Respuesta simulada de la IA:', mockResponse);
  return mockResponse;
  // --- END MOCK IMPLEMENTATION ---

  /*
  // --- EJEMPLO DE IMPLEMENTACIÓN REAL (para el futuro) ---
  const prompt = CREATE_SCHEMA_FROM_TEXT_PROMPT.replace('{{TEXT_INPUT}}', text);
  const response = await fetch('/api/generate-schema', { // Un endpoint de SvelteKit
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error('La API de IA ha devuelto un error.');
  }

  const data = await response.json();
  // Aquí se necesitaría una validación robusta del esquema de `data` (ej. con Zod).
  return data as AISchemaResponse;
  */
}

/**
 * Simula una llamada a la IA para expandir el contenido de un nodo.
 * @param nodeContent El texto del nodo a expandir.
 * @returns Una promesa que se resuelve con el texto expandido.
 */
export async function expandNode(nodeContent: string): Promise<string> {
  console.log('IA (mock): Expandiendo el nodo:', nodeContent);
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // La IA mockeada añade un sub-punto genérico.
  const expansion = `<ul><li>Sub-punto generado por IA sobre "${nodeContent}"</li></ul>`;
  return expansion;
}

/**
 * Simula una llamada a la IA para refinar el contenido de un nodo.
 * @param nodeContent El texto del nodo a refinar.
 * @returns Una promesa que se resuelve con el texto refinado.
 */
export async function refineNode(nodeContent: string): Promise<string> {
  console.log('IA (mock): Refinando el nodo:', nodeContent);
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // La IA mockeada simplemente añade "(refinado)" al texto.
  const refinement = `${nodeContent} (refinado por IA)`;
  return refinement;
}
