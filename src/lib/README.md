# Arquitectura del Proyecto (`/src/lib`)

Bienvenido al corazón de la aplicación. El directorio `/src/lib` contiene todo el código fuente principal, organizado de manera modular para promover la mantenibilidad, escalabilidad y una clara separación de responsabilidades.

Esta documentación sirve como una guía de alto nivel de la arquitectura. Para obtener detalles más profundos, consulta los archivos `README.md` dentro de cada subdirectorio.

## Filosofía Arquitectónica General

La aplicación sigue un patrón de diseño inspirado en la **arquitectura por capas** y el **estado centralizado**, adaptado al ecosistema de SvelteKit.

-   **Flujo de Datos Unidireccional**: La interfaz de usuario (componentes de Svelte) reacciona a los cambios en los almacenes de estado (Svelte Stores). Las interacciones del usuario en los componentes desencadenan acciones en los stores, que a su vez actualizan el estado, y la UI se actualiza en consecuencia. `UI -> Store -> UI`.
-   **Separación de Responsabilidades**: Cada directorio tiene un propósito claro. Los componentes no contienen lógica de negocio compleja; los stores orquestan el estado y la lógica de las características; y los servicios encapsulan la comunicación con sistemas externos (como bases de datos o APIs).

## Mapa de Directorios

A continuación se describe el propósito de cada directorio principal dentro de `src/lib`:

### [`/actions`](./actions/README.md)
Contiene acciones personalizadas de Svelte (`use:action`). Estas son funciones reutilizables que encapsulan lógica de manipulación del DOM, como detectar un clic fuera de un elemento o crear un portal.

### [`/assets`](./assets/README.md)
Almacena todos los activos estáticos como iconos SVG, imágenes y fuentes. Vite/SvelteKit los procesa y optimiza automáticamente.

### [`/components`](./components/README.md)
El hogar de todos nuestros componentes de Svelte. Está subdividido en `core`, `features`, `layout` y `ui` para una clara separación entre componentes de presentación (tontos) y componentes de características (inteligentes).

### [`/editor`](./editor/README.md)
Encapsula toda la configuración y la lógica del editor de texto Tiptap/ProseMirror. Define nodos personalizados y extensiones que añaden la funcionalidad principal de la aplicación, como la creación de tarjetas y los comandos slash.

### [`/schemas`](./schemas/README.md)
Define esquemas de validación (usando Zod) para las interacciones con la API de IA. Esto garantiza que los datos recibidos de los modelos de lenguaje sean estructurados y seguros a nivel de tipos.

### [`/services`](./services/README.md)
Contiene la lógica de negocio y la comunicación con el exterior. Se divide en servicios de `core` (autenticación, errores), `features` (lógica específica de una característica como el cálculo de revisión espaciada) y `api` (clientes para APIs externas como la base de datos o la IA).

### [`/stores`](./stores/README.md)
El cerebro de la aplicación. Contiene todos los Svelte Stores que gestionan el estado de la aplicación. Los stores son el "pegamento" que conecta la UI con la lógica de negocio, siguiendo un patrón reactivo.

### [`/styles`](./styles/README.md)
Define el sistema de diseño de la aplicación a través de CSS. `global.css` establece todas las variables CSS (colores, tipografía, espaciado) que garantizan una apariencia consistente en toda la UI.

### [`/types`](./types/README.md)
Contiene definiciones de tipos globales de TypeScript utilizadas en toda la aplicación. Esto ayuda a mantener la consistencia y la seguridad de tipos.

### [`/utils`](./utils/README.md)
Una colección de funciones de utilidad puras y reutilizables que no encajan en ninguna otra categoría. Por ejemplo, formateadores de fecha, funciones de debounce, etc.