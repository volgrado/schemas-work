# Arquitectura de Componentes (`/src/lib/components`)

Este directorio contiene todos los componentes de Svelte que conforman la interfaz de usuario de la aplicación. La estructura y filosofía están diseñadas para maximizar la reutilización, la mantenibilidad y la clara separación de responsabilidades.

## Principios Fundamentales

1.  **Separación de Lógica y Presentación**: Este es el principio más importante. Los componentes se dividen principalmente en dos categorías:
    *   **Componentes de UI (`/ui`)**: Son componentes "tontos" y reutilizables centrados en la apariencia y la interacción del usuario a bajo nivel (e.g., `Button`, `Modal`, `Input`). No contienen lógica de negocio.
    *   **Componentes de Características (`/features`)**: Son componentes "inteligentes" que orquestan la lógica de una funcionalidad específica (e.g., `CardEditorPanel`, `ReviewPanel`). Se conectan a los Svelte Stores para gestionar el estado.

2.  **Estado Centralizado en Stores**: Los componentes, especialmente los de características, no deben gestionar un estado complejo internamente. En su lugar, se suscriben a los stores (`/src/lib/stores`). Los componentes leen el estado de los stores para renderizarse y llaman a las funciones de los stores para ejecutar acciones. Esto sigue un patrón de flujo de datos unidireccional y hace que el estado de la aplicación sea predecible y fácil de depurar.

3.  **Mínima Invocación Directa de Servicios**: Los componentes rara vez deben invocar servicios (`/src/lib/services`) directamente. La lógica de negocio y las llamadas a servicios (e.g., para persistencia o cálculos complejos) deben ser manejadas dentro de los stores. Los componentes simplemente desencadenan acciones en el store (e.g., `reviewStore.startReview()`).

## Estructura de Directorios

La organización está inspirada en una mezcla de diseño atómico y clasificación por funcionalidad:

-   **/core**: Contiene componentes fundamentales para la estructura y experiencia de la aplicación que no son específicos de una sola característica. Orquestan otras partes de la UI y a menudo se conectan a stores centrales como `documentStore` o `editorStore`.
    -   *Ejemplo*: `DocumentView.svelte`, `Sidebar.svelte`.

-   **/features**: Cada subdirectorio aquí corresponde a una funcionalidad principal de la aplicación. Estos componentes suelen estar estrechamente acoplados a un store de característica dedicado.
    -   *Ejemplo*: `cardEditor/CardEditorPanel.svelte` (asociado a `cardEditorStore`), `review/ReviewPanel.svelte` (asociado a `reviewStore`).

-   **/layout**: Componentes que definen la estructura principal de la página, como cabeceras, pies de página y áreas de contenido principal.
    -   *Ejemplo*: `MainLayout.svelte`, `Header.svelte`.

-   **/ui**: La "biblioteca de componentes" de la aplicación. Son componentes genéricos, reutilizables y de presentación. Se estilizan mediante variables CSS globales (`/src/lib/styles`) y pueden tener variantes, pero no conocen la lógica de negocio.
    -   *Ejemplo*: `Button.svelte`, `Input.svelte`, `Modal.svelte`.

## Patrones de Interacción

-   **Componente -> Store**: Un componente de característica invoca una acción en un store. Por ejemplo, al hacer clic en un botón, se llama a `commandBarStore.open()`.
-   **Store -> Componente**: El store actualiza su estado. El componente, al estar suscrito (`$commandBarStore`), reacciona automáticamente al nuevo estado y se vuelve a renderizar para mostrar la barra de comandos.
-   **Componente -> Componente (Local)**: Para interacciones simples entre padre e hijo que no necesitan un estado global, se utilizan props y el reenvío de eventos de Svelte (`createEventDispatcher`). Esto evita la sobrecarga de crear un store para un estado puramente local.