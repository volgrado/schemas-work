<!--
  @component
  Button.svelte

  Componente de botón genérico y reutilizable, diseñado para ser coherente
  con la estética minimalista y artesanal de la aplicación.

  @props {'primary' | 'secondary' | 'ghost'} [variant='primary'] - La variante visual y jerárquica del botón.
  @props {'sm' | 'md' | 'lg'} [size='md'] - El tamaño del botón.
  @slot - El contenido del botón (texto, iconos, etc.).
  @restProps - Cualquier otro atributo HTML se pasará directamente al elemento <button>.
-->
<script lang="ts">
  /**
   * La variante visual del botón.
   * @type {'primary' | 'secondary' | 'ghost'}
   */
  export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';

  /**
   * El tamaño del botón.
   * @type {'sm' | 'md' | 'lg'}
   */
  export let size: 'sm' | 'md' | 'lg' = 'md';
</script>

<button
  class="btn"
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:btn-ghost={variant === 'ghost'}
  class:btn-sm={size === 'sm'}
  class:btn-md={size === 'md'}
  class:btn-lg={size === 'lg'}
  on:click
  {...$$restProps}
>
  <slot />
</button>

<style>
  .btn {
    /* --- Estructura y Alineación --- */
    display: inline-flex;
    align-items: center;
    justify-content: center;

    /* --- Apariencia --- */
    border: none;
    font-family: var(--font-main);
    font-weight: 600; /* Un peso mayor para mejorar la legibilidad y presencia. */
    border-radius: var(--space-sm);

    /* --- Interacción y Animación --- */
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.1s ease,
      box-shadow 0.2s ease;

    outline: none;
  }

  /* Feedback táctil al presionar el botón. */
  .btn:active {
    transform: scale(0.97);
  }

  /* El resplandor de foco ahora usa nuestras variables de color globales. */
  .btn:focus-visible {
    /* 
      Creamos una variable local --accent-rgb para poder usarla dentro de rgba().
      El valor por defecto es para el tema claro.
    */
    --accent-rgb: 255, 99, 71; /* RGB para nuestro color de acento "Tomato" */
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.35);
  }

  /* --- Modificadores de Tamaño --- */
  .btn-sm {
    height: 32px;
    padding: 0 var(--space-sm);
    font-size: 0.85rem;
  }
  .btn-md {
    height: 40px;
    padding: 0 var(--space-md);
    font-size: 0.9rem;
  }
  .btn-lg {
    height: 48px;
    padding: 0 var(--space-lg);
    font-size: 1rem;
  }

  /* --- Modificadores de Variante (Color) --- */

  /* Variante Principal: Invitadora, no agresiva. */
  .btn-primary {
    background-color: var(--color-accent);
    color: white;
  }
  .btn-primary:hover {
    background-color: var(--color-accent-hover);
    /* Sutil elevación para dar profundidad y una sensación premium. */
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--color-accent-rgb), 0.2);
  }
  .btn-primary:disabled {
    background-color: var(--color-accent);
    opacity: 0.5; /* Más simple y universal que un color hardcodeado. */
    cursor: not-allowed;
    transform: none; /* Resetea transformaciones en estado deshabilitado. */
    box-shadow: none;
  }

  /* Variante Secundaria: Clara, pero no compite con la primaria. */
  .btn-secondary {
    background-color: var(--color-gray-100);
    color: var(--color-text);
  }
  .btn-secondary:hover {
    background-color: var(--color-gray-200);
  }
  .btn-secondary:disabled {
    background-color: var(--color-gray-100);
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Variante Fantasma: Mínima, para acciones de baja prioridad. */
  .btn-ghost {
    background-color: transparent;
    color: var(
      --color-gray-500
    ); /* Usamos un gris para que sea menos prominente. */
    font-weight: 500;
  }
  .btn-ghost:hover {
    background-color: var(--color-gray-100);
    color: var(
      --color-text
    ); /* El color se vuelve más fuerte al interactuar. */
  }
  .btn-ghost:disabled {
    background-color: transparent;
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
