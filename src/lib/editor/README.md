# Arquitectura del Editor (`/src/lib/editor`)

Este directorio encapsula toda la lógica, configuración y componentes relacionados con el editor de texto basado en Tiptap/ProseMirror. Es una de las partes más críticas y complejas de la aplicación.

## Filosofía de Diseño

El objetivo principal es crear una experiencia de edición potente y personalizada que se integre a la perfección con el resto de nuestra aplicación Svelte. La clave de nuestra arquitectura es la **abstracción y la modularidad**.

1.  **Integración Centralizada**: La inicialización y configuración del editor se centralizan en el componente `DocumentView.svelte` (`/src/lib/components/core/DocumentView.svelte`). Este componente es el **único** que escribe en el `editorStore`, siguiendo un patrón de "escritor único, múltiples lectores".

2.  **Extensiones Modulares**: Cada pieza de funcionalidad del editor se implementa como una extensión personalizada de Tiptap. Esto mantiene el código organizado y permite activar o desactivar características fácilmente. Las extensiones se dividen en dos categorías:
    *   **Nodes**: Definen elementos de bloque o en línea en el esquema del documento (e.g., `Card.ts`, `Heading.ts`).
    *   **Extensions**: Añaden comportamiento, atajos de teclado o plugins sin introducir un nuevo tipo de nodo (e.g., `SlashCommands`, `Highlight` a través de `suggestion.ts`).

3.  **Comunicación a través de Stores**: La comunicación entre el editor y el resto de la aplicación se realiza a través de Svelte Stores, principalmente el `editorStore`. Las extensiones personalizadas pueden leer el estado de otros stores, pero para enviar información *desde* el editor *hacia* la UI de Svelte, actualizan el `editorStore` o invocan acciones en otros stores.

## Estructura de Directorios

-   **/nodes**: Contiene las definiciones de nuestros nodos personalizados de Tiptap. Cada archivo define el nombre, el esquema, los comandos y las reglas de renderizado del nodo.
    -   `Card.ts`: Un ejemplo complejo que define el nodo para las tarjetas de estudio, incluyendo atributos personalizados como `nodeId`.

-   **/slashCommands**: Implementa la funcionalidad del menú de comandos que aparece al escribir `/`.
    -   `suggestion.ts`: El corazón de esta característica. Es una extensión de Tiptap que utiliza el plugin `Suggestion` para detectar el patrón de activación, filtrar comandos y, lo más importante, **invocar acciones en el `slashMenuStore`**. Pasa al store la lista de comandos, la función para ejecutar un comando y la posición en pantalla.
    -   `commands.ts`: Define la lista de comandos disponibles, sus íconos, descripciones y la lógica de ejecución (que utiliza la cadena de comandos de Tiptap).

-   `setup.ts`: Un archivo crucial que exporta la función `createEditor`. Esta función ensambla todas las piezas: importa las extensiones de nodos y de comportamiento, configura los plugins (como `Collaboration` para Y.js) y devuelve una nueva instancia del editor Tiptap. Esto asegura que cada instancia del editor sea consistente.

## Flujo de Datos para Características Complejas (Ej: Comandos Slash)

1.  **Detección (Tiptap)**: El usuario escribe `/`. La extensión `suggestion.ts` en Tiptap detecta esto.
2.  **Apertura del Store (Tiptap -> Store)**: La extensión `suggestion.ts` llama a `slashMenuStore.open()`, pasándole todos los datos necesarios: la lista de comandos, la consulta del usuario, una función para el posicionamiento (`clientRect`) y una **función de callback** para ejecutar el comando seleccionado.
3.  **Renderizado (Store -> Svelte)**: El componente `SlashMenu.svelte` (`/src/lib/components/features/slashMenu`) está suscrito al `slashMenuStore`. Detecta que `isOpen` es `true` y se renderiza en la pantalla utilizando los datos del store.
4.  **Selección (Svelte -> Store)**: El usuario navega por el menú. El componente `SlashMenu.svelte` captura las pulsaciones de teclas y llama a acciones en el `slashMenuStore` como `moveSelection()` o `triggerCommand()`.
5.  **Ejecución (Store -> Tiptap)**: `slashMenuStore.triggerCommand()` invoca la función de callback que se le pasó en el paso 2. Esta callback, que vive dentro de la extensión de Tiptap, finalmente ejecuta el comando en el editor (e.g., `editor.chain().focus().setHeading({ level: 1 }).run()`).

Este patrón de "ida y vuelta" a través de un store es fundamental. Desacopla la lógica de la UI de Svelte de la lógica interna del editor, permitiendo que cada parte se ocupe de lo que mejor sabe hacer.