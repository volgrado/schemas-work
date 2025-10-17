# Definiciones de Tipos Globales (`/src/lib/types`)

Este directorio centraliza las definiciones de tipos y de interfaces de TypeScript que se utilizan en múltiples partes de la aplicación. Sirve como la "fuente de la verdad" para las estructuras de datos compartidas.

## Filosofía

1.  **Evitar la Repetición (DRY - Don't Repeat Yourself)**: En lugar de definir la misma estructura de datos en múltiples archivos (lo que llevaría a inconsistencias), la definimos una sola vez aquí y la importamos donde sea necesario.

2.  **Claridad y Contrato**: Los tipos e interfaces actúan como una forma de documentación y definen un "contrato" claro para la forma de los datos que fluyen a través de la aplicación. Esto hace que el código sea más fácil de entender y razonar.

3.  **Seguridad de Tipos Global**: Al tener un conjunto de tipos compartidos, TypeScript puede verificar en tiempo de compilación que los datos que pasan entre diferentes módulos (e.g., de un servicio a un store, y de un store a un componente) son consistentes, previniendo una clase entera de errores de runtime.

## ¿Qué va aquí?

-   **Tipos de Datos del Dominio**: Las estructuras de datos principales de la aplicación. Por ejemplo, `Card.ts` define cómo es una tarjeta de estudio, con sus propiedades `id`, `question`, `answer`, `dueDate`, etc. `Document.ts` define la estructura de un documento.

-   **Tipos de Estado**: A veces, la forma del estado de un store complejo (`TTSState`, `ReviewState`) se define aquí para ser reutilizada o para desacoplar la definición del store de su implementación.

-   **Interfaces para Servicios**: Se pueden definir interfaces para abstraer implementaciones de servicios (e.g., `TTSService` en `tts.service.ts`), permitiendo la inyección de dependencias y facilitando las pruebas.

## ¿Qué NO va aquí?

-   **Tipos Específicos de un Componente**: Si un tipo solo se utiliza dentro de un único componente de Svelte y no se comparte, es mejor mantenerlo local a ese componente. Esto evita saturar el espacio de nombres global.
-   **Tipos Inferidos**: Si un tipo se puede inferir fácilmente de una función o un esquema Zod (como los de `/lib/schemas`), a menudo no es necesario declararlo explícitamente aquí. Por ejemplo, el tipo para `createCard` se infiere directamente del `createCardSchema`.

## Ejemplo de Uso

El tipo `Card` es un ejemplo perfecto. Se define en `src/lib/types/Card.ts` y luego se importa en:

-   `cardService.ts`: Para tipar los argumentos y los valores de retorno de sus funciones (`getCard(id: string): Promise<Card>`).
-   `cardEditorStore.ts`: Para tipar la tarjeta que se está editando actualmente (`$cardEditorStore.card: Card | null`).
-   `ReviewPanel.svelte`: Para tipar la prop que recibe la tarjeta a revisar (`export let card: Card`).

Si en el futuro necesitamos añadir una nueva propiedad a todas las tarjetas (e.g., `tags: string[]`), solo necesitamos modificar `Card.ts`, y TypeScript nos señalará inmediatamente todos los lugares en la aplicación que necesitan ser actualizados para manejar esta nueva propiedad.