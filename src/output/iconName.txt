// src/lib/types/iconName.ts

/**
 * Define un tipo estricto para todos los nombres de iconos válidos en la aplicación.
 *
 * Este tipo se deriva directamente de las claves del diccionario `icons` en el
 * componente `Icon.svelte`. Utilizar este tipo en lugar de un `string` genérico
 * proporciona varias ventajas:
 *
 * 1.  **Autocompletado:** El editor de código (VS Code) te sugerirá nombres de iconos válidos
 *     cuando uses un componente que espere esta prop.
 * 2.  **Seguridad de Tipos:** TypeScript lanzará un error en tiempo de compilación si
 *     intentas usar un nombre de icono que no existe, previniendo iconos rotos
 *     en producción.
 * 3.  **Mantenibilidad:** Si añades un nuevo icono a `Icon.svelte`, solo necesitas
 *     añadirlo aquí para que esté disponible de forma segura en toda la aplicación.
 */
export type IconName =
  // Generales y de Archivo
  | 'plus'
  | 'command'
  | 'download-cloud'
  | 'upload-cloud'
  | 'file-text'
  // UI y Acciones
  | 'x'
  | 'copy'
  | 'trash-2'
  | 'sparkles'
  | 'pen-tool'
  // Funcionalidades
  | 'zap'
  | 'volume-2'
  | 'play'
  | 'pause'
  | 'x-circle'
  // Onboarding y Ayuda
  | 'lock'
  | 'help-circle'
  // Editor de Texto
  | 'bold'
  | 'italic'
  | 'list'
  | 'type';
