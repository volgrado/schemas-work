# Gestión de Activos (`/src/lib/assets`)

Este directorio almacena todos los activos estáticos que se utilizan en la aplicación, como imágenes, iconos y fuentes.

## Filosofía

El objetivo es mantener los activos organizados y optimizados para su uso en la web.

1.  **Centralización**: Todos los activos estáticos residen aquí. Esto facilita su localización y gestión.

2.  **Optimización**: Las imágenes y otros activos deben ser optimizados para la web antes de ser añadidos al repositorio para asegurar tiempos de carga rápidos. Esto puede incluir compresión de imágenes, selección del formato adecuado (e.g., WebP, SVG) y asegurarse de que las dimensiones de las imágenes no sean más grandes de lo necesario.

## Estructura de Directorios

-   **/images**: Contiene imágenes rasterizadas como PNG, JPG, WebP, etc.
-   **/icons**: Contiene iconos, preferiblemente en formato SVG para que sean escalables y se puedan estilizar con CSS.
-   **/fonts**: Contiene archivos de fuentes personalizadas si la aplicación no utiliza un servicio de fuentes web como Google Fonts.

## Uso en la Aplicación

SvelteKit/Vite gestiona automáticamente los activos importados desde este directorio.

-   **En componentes Svelte**: Se pueden importar directamente en el script y usarlos en el marcado.

    ```svelte
    <script>
      import logo from '$lib/assets/icons/logo.svg';
    </script>

    <img src={logo} alt="Logo de la aplicación" />
    ```

-   **En archivos CSS**: Se pueden referenciar utilizando una ruta relativa.

    ```css
    .background-image {
      background-image: url('$lib/assets/images/background.webp');
    }
    ```

Vite procesará estas referencias, aplicando hashing a los nombres de archivo para un cacheo eficiente en producción y asegurando que las rutas sean correctas.