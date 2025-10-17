# Acciones de Svelte (`/src/lib/actions`)

Este directorio contiene acciones personalizadas de Svelte. Las acciones son una característica poderosa de Svelte que permite adjuntar lógica de comportamiento a los elementos del DOM. Son una forma limpia de reutilizar interacciones del DOM sin tener que encapsularlas en componentes completos.

## Filosofía

Utilizamos las acciones para encapsular interacciones complejas o repetitivas con el DOM que no son adecuadas para ser un componente. Esto nos ayuda a mantener nuestro código de componentes más limpio y declarativo. Las acciones son ideales para:

-   Interactuar con bibliotecas de terceros que manipulan el DOM.
-   Gestionar eventos del DOM personalizados o complejos.
-   Añadir comportamiento dinámico que depende del ciclo de vida de un elemento.

## Acciones Disponibles

### `clickOutside`

-   **Propósito**: Ejecutar una función de callback cuando el usuario hace clic *fuera* del elemento al que se aplica la acción.
-   **Uso Típico**: Cerrar menús desplegables, modales o paneles cuando el usuario interactúa con otra parte de la aplicación. Esto es fundamental para una experiencia de usuario fluida e intuitiva.
-   **Implementación**: La acción adjunta un detector de eventos al objeto `window`. Cuando ocurre un clic, comprueba si el `event.target` está contenido dentro del nodo al que se adjunta la acción. Si no lo está, invoca la función de callback.

    ```svelte
    <script>
      import { clickOutside } from '$lib/actions/clickOutside';
      let isOpen = true;
      function close() {
        isOpen = false;
      }
    </script>

    {#if isOpen}
      <div use:clickOutside on:click_outside={close}>
        <p>Contenido del menú...</p>
      </div>
    {/if}
    ```

### `portal`

-   **Propósito**: Renderizar un elemento del DOM en una ubicación diferente del árbol del DOM, generalmente en el `document.body`.
-   **Uso Típico**: Esencial para componentes que deben "escapar" de sus contenedores padres para evitar problemas de `z-index`, `overflow: hidden` o posicionamiento. Se usa para modales, tooltips y menús flotantes.
-   **Implementación**: La acción simplemente toma el nodo y lo mueve a `document.body` cuando el elemento se monta en el DOM. También se encarga de limpiar y eliminar el nodo del `body` cuando el elemento se destruye, previniendo fugas de memoria.

    ```svelte
    <script>
      import { portal } from '$lib/actions/portal';
    </script>

    <div use:portal>
      <p>Este modal se renderizará en el body, no donde está declarado.</p>
    </div>
    ```