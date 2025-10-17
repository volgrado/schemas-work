# Arquitectura de Servicios (`/src/lib/services`)

Este directorio es la **capa de lógica de negocio** de la aplicación. Es responsable de orquestar operaciones complejas, implementar la lógica de las características y actuar como intermediario entre la aplicación y los sistemas externos (bases de datos, APIs, SDKs).

## Filosofía de Diseño

El objetivo principal es lograr una **separación de responsabilidades estricta** y una alta **cohesión**, siguiendo principios de diseño de software sólido.

1.  **Orquestación a través de Stores**: Los servicios no son invocados directamente por los componentes de la UI. Los **Svelte Stores** actúan como controladores de estado y orquestadores. Un store invoca a uno o varios servicios para ejecutar una operación y, basándose en el resultado, actualiza su estado. La UI, a su vez, reacciona a los cambios en el store.
    *   *Ejemplo*: `reviewStore.submitReview()` invoca a `reviewService` y a `cardService` para procesar una revisión, y luego actualiza su estado con la siguiente tarjeta.

2.  **Abstracción de Dependencias (Inversión de Control)**: Los servicios ocultan los detalles de implementación de las fuentes de datos y APIs. `cardService` expone un método `updateCard(card)`, pero el resto de la aplicación no sabe si esto se guarda en Firebase, una API REST o `localStorage`. Este principio nos permite intercambiar dependencias sin afectar la lógica de negocio.

3.  **Composición y Responsabilidad Única**: Cada servicio debe tener una responsabilidad clara y única. Un servicio puede componerse de otros para realizar tareas más complejas, promoviendo la reutilización de código.
    *   *Ejemplo*: `reviewService` no sabe cómo guardar una tarjeta; delega esa responsabilidad en `cardService`.

## Estructura de Directorios

La estructura está diseñada para reflejar esta separación de responsabilidades, dividiéndose en capas de abstracción.

-   **/api**: Contiene los **clientes de API de más bajo nivel**. Su única responsabilidad es realizar la comunicación de red (e.g., `fetch`) y manejar la serialización/deserialización de datos. No contienen lógica de negocio.
    -   `databaseClient.ts`: Funciones `get`, `post`, `put` que interactúan con el backend de la base de datos.
    -   `aiClient.ts`: Lógica para enviar prompts a un modelo de lenguaje y recibir la respuesta.

-   **/core**: Servicios transversales esenciales para el funcionamiento de la aplicación, pero que no están ligados a una característica específica.
    -   `errorService.ts`: Servicio centralizado para el reporte y logging de errores.
    -   `authService.ts`: Gestiona la autenticación, sesiones de usuario y tokens.
    -   `syncService.ts`: Orquesta la sincronización de datos con el backend (potencialmente usando Y.js o similar).

-   **/features**: Aquí reside el **corazón de la lógica de negocio**. Cada servicio implementa las reglas y procesos para una característica específica de la aplicación.
    -   `reviewService.ts`: Implementa el algoritmo de repetición espaciada (`calculateNextReviewDate`). No interactúa directamente con la base de datos.
    -   `cardService.ts`: Proporciona una API de tipo CRUD (`createCard`, `updateCard`) para las tarjetas. Actúa como una capa de abstracción sobre el `databaseClient`, transformando los datos si es necesario.

-   **/tts** (Ejemplo de Abstracción de Interfaz):
    -   `tts.service.ts`: Define una **interfaz** `TTSService` (`speak`, `pause`). Esto establece un contrato para cualquier servicio de Text-to-Speech.
    -   `BrowserTTSService.ts`: Una **implementación concreta** que utiliza la API del navegador `SpeechSynthesis`.
    -   `CloudTTSService.ts` (Hipotético): Otra implementación que podría usar una API de IA en la nube, intercambiable con la anterior.

## Flujo de Ejemplo Detallado: Revisar una Tarjeta

1.  **UI (`ReviewPanel.svelte`)**: El usuario hace clic en "Buena". Se invoca `reviewStore.submitReview('good')`.
2.  **Store (`reviewStore`)**:
    a. Obtiene la tarjeta actual de su estado.
    b. Invoca `reviewService.calculateNextReview(currentCard, 'good')` para obtener los nuevos parámetros de revisión (e.g., `dueDate`, `interval`).
    c. Crea un objeto `updatedCard` fusionando los nuevos parámetros.
    d. Invoca `cardService.updateCard(updatedCard)` para persistir el cambio.
    e. En caso de éxito, actualiza su propio estado para cargar la siguiente tarjeta.
3.  **Servicio de Característica (`reviewService`)**: La función `calculateNextReview` ejecuta lógica pura, sin efectos secundarios, y devuelve el resultado.
4.  **Servicio de Característica (`cardService`)**: La función `updateCard` invoca a `databaseClient.put('/cards/123', updatedCard)`. Puede contener lógica para transformar la tarjeta al formato esperado por la API.
5.  **Cliente API (`databaseClient`)**: La función `put` realiza la llamada `fetch`, gestiona los encabezados de autenticación y devuelve la respuesta del servidor.

Este flujo demuestra cómo cada capa tiene una responsabilidad clara, lo que hace que el sistema sea más fácil de entender, probar y mantener.