# Arquitectura de Estilos (`/src/lib/styles`)

Este directorio contiene todos los estilos globales de la aplicación. Nuestra filosofía es utilizar CSS moderno, modular y mantenible, aprovechando las variables de CSS (Custom Properties) para crear un sistema de diseño cohesivo y fácil de personalizar.

## Filosofía de Diseño

1.  **Variables CSS para Todo**: El núcleo de nuestro sistema de diseño se basa en las variables de CSS definidas en `global.css`. En lugar de usar valores hardcodeados (e.g., `#FFFFFF`, `16px`), utilizamos variables semánticas (e.g., `var(--color-background)`, `var(--font-size-base)`). Esto permite una consistencia total y facilita enormemente los cambios de tema (como un modo oscuro).

2.  **Estilos Globales Mínimos**: `global.css` establece los estilos base para elementos HTML (`body`, `h1`, `p`, etc.) y define todas las variables del sistema de diseño. Sin embargo, evitamos escribir estilos de componentes específicos aquí. La idea es establecer un "lienzo" predeterminado y un conjunto de herramientas (variables) para que los componentes las usen.

3.  **Estilos por Componente (Scoped)**: La gran mayoría de nuestros estilos se escriben directamente dentro de los componentes de Svelte (`<style>`). Svelte procesa estos estilos para que sean "scoped" por defecto, lo que significa que solo se aplican al componente actual. Esto previene conflictos de selectores y hace que los componentes sean verdaderamente autocontenidos.

4.  **No se utilizan Preprocesadores (Sass/Less)**: Hemos optado por utilizar CSS nativo moderno. Las variables de CSS, junto con características como `calc()`, `clamp()` y selectores avanzados, nos proporcionan la mayor parte del poder que ofrecen los preprocesadores, pero sin la necesidad de una dependencia adicional o un paso de compilación.

## Estructura de Archivos

-   `global.css`: El archivo más importante. Define:
    -   **Variables de Color**: Nombres semánticos para todos los colores usados en la aplicación (e.g., `--color-primary`, `--color-text`, `--color-background`).
    -   **Tipografía**: Variables para familias de fuentes, tamaños (`--font-size-sm`, `--font-size-base`, etc.), grosores y alturas de línea.
    -   **Espaciado y Tamaños**: Una escala de espaciado (`--space-xs`, `--space-sm`, etc.) para `margin`, `padding` y `gap`. Esto asegura un ritmo vertical y horizontal consistente.
    -   **Bordes y Sombras**: Variables para `border-radius` y `box-shadow` para mantener una apariencia uniforme en todos los componentes.
    -   **Z-Index**: Una pila de `z-index` para gestionar las capas de la interfaz (`--z-modal`, `--z-header`).
    -   **Resets y Estilos Base**: Un reset de CSS simple (a menudo basado en `modern-normalize`) y estilos predeterminados para el `body`, enlaces, etc.

-   `tiptap.css`: Contiene estilos específicos para anular o complementar los estilos predeterminados del editor Tiptap/ProseMirror. Esto incluye la apariencia del cursor, la selección, los placeholders y los estilos para los nodos personalizados.

## Cómo Usar el Sistema de Diseño

Dentro de un bloque `<style>` de un componente de Svelte, simplemente se hace referencia a las variables definidas en `global.css`.

```svelte
<style>
  .mi-boton {
    background-color: var(--color-primary);
    color: var(--color-on-primary);
    padding: var(--space-sm) var(--space-md);
    font-size: var(--font-size-base);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }

  .mi-boton:hover {
    background-color: var(--color-primary-hover);
  }
</style>
```

Este enfoque garantiza que si se decide cambiar el color primario de la marca, solo es necesario modificar la variable `--color-primary` en `global.css`, y todos los componentes que la utilizan se actualizarán automáticamente.