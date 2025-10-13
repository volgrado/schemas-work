// src/lib/types/index.ts

/**
 * @file Este archivo actúa como el punto de entrada principal para los tipos de dominio
 * de la aplicación. Su propósito es re-exportar los tipos definidos en otros
 * archivos dentro de este directorio.
 *
 * BENEFICIOS:
 * - **Importaciones más limpias:** En lugar de `import { X } from '$lib/types/x'`,
 *   se puede usar `import { X } from '$lib/types'`.
 * - **Centralización:** Proporciona una visión clara de todos los tipos de dominio
 *   disponibles en la aplicación.
 * - **Mantenibilidad:** Facilita la refactorización y el movimiento de tipos sin
 *   romper las importaciones en toda la base de código.
 */

// --- Exportaciones de Tipos de Dominio ---

export * from './command';
export * from './iconName';
export * from './tree';

// --- Tipos de Datos Principales (Anteriormente en `index.ts` en la raíz) ---

/**
 * Representa la identidad criptográfica única de un usuario, generada y
 * almacenada localmente en el navegador.
 */
export interface Identity {
  publicKey: string;
  privateKey: string;
}

/**
 * Representa los metadatos de un ítem en el directorio de trabajo del usuario.
 * Puede ser un esquema o una carpeta.
 */
export interface SchemaMetadata {
  id: string; // UUID v4
  title: string;
  createdAt: number; // Timestamp Unix
  updatedAt: number; // Timestamp Unix
  type: 'schema' | 'folder';
  parentId: string | null; // ID de la carpeta padre, o null si está en la raíz
}

/**
 * Representa una tarjeta de estudio individual, a menudo asociada a un nodo
 * de un esquema para técnicas de repaso espaciado.
 */
export interface DomainCard {
  q: string; // Pregunta
  a: string; // Respuesta

  // --- Propiedades para Repaso Espaciado (Algoritmo SM-2) ---
  repetitions?: number; // Número de veces que la tarjeta se ha repasado correctamente
  easeFactor?: number; // Un multiplicador que ajusta la dificultad (>= 1.3)
  interval?: number; // El número de días hasta el próximo repaso
  dueDate?: number; // La fecha del próximo repaso en formato de timestamp Unix
}

/**
 * Representa la estructura de la "bóveda" completa del usuario, que se utiliza
 * para exportar e importar todos los datos de la aplicación.
 */
export interface Vault {
  schemas: SchemaMetadata[]; // La estructura completa del directorio
  content: Record<string, string>; // Un mapa del ID del esquema a su contenido (en Base64)
}
