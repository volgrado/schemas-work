# Funciones de Utilidad (`/src/lib/utils`)

Este directorio es un contenedor para funciones pequeñas, reutilizables y, en su mayoría, puras, que no encajan en ninguna otra categoría de la arquitectura del proyecto.

## Filosofía

El propósito de las utilidades es evitar la duplicación de código y abstraer lógica común en funciones simples y fáciles de probar.

1.  **Pureza y sin Efectos Secundarios**: Idealmente, una función de utilidad debe ser una función pura. Esto significa que, para la misma entrada, siempre producirá la misma salida y no tendrá efectos secundarios observables (como modificar el estado global o hacer una llamada de red).

2.  **Reutilización**: Las funciones aquí deben ser lo suficientemente genéricas como para ser utilizadas en múltiples lugares de la aplicación. Si una función solo se usa en un componente o servicio, es mejor mantenerla local en ese archivo.

3.  **Simplicidad**: Las utilidades deben ser pequeñas y tener una única responsabilidad. Si una función de utilidad comienza a crecer en complejidad, es una señal de que podría necesitar ser refactorizada o movida a un servicio si contiene lógica de negocio.

## ¿Qué va aquí?

-   **Formateadores**: Funciones para formatear fechas, números o cadenas de texto (e.g., `formatDate(date)`).
-   **Ayudantes de Manipulación de Datos**: Funciones para trabajar con arrays, objetos o cadenas que no son proporcionadas de forma nativa por JavaScript (e.g., `groupBy(array, key)`).
-   **Funciones de Temporización**: Implementaciones de `debounce` y `throttle` para controlar la frecuencia con la que se ejecutan las funciones.
-   **Generadores**: Funciones que generan valores, como IDs únicos (e.g., un simple envoltorio alrededor de `uuid`).

## ¿Qué NO va aquí?

-   **Lógica de Negocio**: Cualquier lógica que sea específica del dominio de la aplicación (e.g., calcular la próxima fecha de revisión de una tarjeta) pertenece a un servicio en `/src/lib/services`.
-   **Lógica de Estado**: Cualquier función que necesite leer o escribir en un Svelte Store. Esa lógica pertenece al propio store.
-   **Llamadas de API**: La comunicación con sistemas externos es responsabilidad de los servicios.
-   **Código Específico de un Componente**: La lógica que manipula directamente el estado o los props de un componente debe permanecer dentro de ese componente.

## Ejemplo de Uso

Un caso de uso clásico es la función `debounce`, que retrasa la ejecución de una función hasta que ha pasado un cierto tiempo sin que se llame de nuevo. Es útil para evitar llamadas excesivas a funciones en eventos como el `input` o el redimensionamiento de la ventana.

```javascript
// src/lib/utils/debounce.ts
export function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}
```

```svelte
// En un componente
<script>
  import { debounce } from '$lib/utils/debounce';

  function handleInput(event) {
    console.log('Buscando:', event.target.value);
  }

  const debouncedHandleInput = debounce(handleInput, 300);
</script>

<input type="text" on:input={debouncedHandleInput} />
```