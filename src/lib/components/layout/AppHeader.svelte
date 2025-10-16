<!-- src/lib/components/layout/AppHeader.svelte (VERSIÓN FINAL CON AYUDA INTEGRADA) -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Logo from '$lib/components/ui/Logo.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';
  import Icon from '$lib/components/ui/Icon.svelte'; // Importamos Icon para el kbd

  const dispatch = createEventDispatcher();

  function showWelcome() {
    dispatch('showWelcome');
  }

  // Permite que el padre pase clases dinámicas (ej. para animaciones de entrada)
  let className = '';
  export { className as class };
</script>

<header class="app-header {className}">
  <div class="header-content">
    <!-- Sección Izquierda: Un placeholder para futuras acciones como 'Menú' o 'Atrás' -->
    <div class="header-section left">
      <slot />
    </div>

    <!-- Sección Central: La marca, centrada perfectamente -->
    <div class="header-section center">
      <button
        class="brand-button"
        on:click={showWelcome}
        aria-label="Volver a la pantalla de bienvenida"
      >
        <div class="logo-wrapper">
          <Logo size={28} />
        </div>
        <h1 class="brand-name">
          Schemas<span class="accent-word">.Work</span>
        </h1>
      </button>
    </div>

    <!-- Sección Derecha: Contiene acciones globales como la ayuda -->
    <div class="header-section right">
      <!-- Ocultamos el tooltip en pantallas táctiles pequeñas donde no es útil -->
      <div class="desktop-only-tooltip">
        <HelpTooltip>
          <!-- *** INICIO DE LA SOLUCIÓN: MEJORA VISUAL DEL TOOLTIP *** -->
          <div class="shortcuts">
            <div class="shortcut-item">
              <span>Menú</span>
              <div class="keys">
                <kbd>Ctrl</kbd><span>+</span><kbd>K</kbd>
              </div>
            </div>
            <div class="shortcut-item">
              <span>Editar Tarjetas</span>
              <div class="keys">
                <kbd>Ctrl</kbd><span>+</span><kbd>'</kbd>
              </div>
            </div>
          </div>
          <!-- *** FIN DE LA SOLUCIÓN *** -->
        </HelpTooltip>
      </div>
    </div>
  </div>
</header>

<style>
  .app-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 50;
    background-color: var(--color-background);
    border-bottom: 1px solid var(--color-gray-100);
    padding: var(--space-sm) 0;
    transition: all 0.3s ease;
  }

  .header-content {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 var(--space-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 36px; /* Altura fija para consistencia */
  }

  /* --- Estructura de 3 Columnas --- */
  .header-section {
    flex: 1;
    display: flex;
    align-items: center;
  }
  .header-section.left {
    justify-content: flex-start;
  }
  .header-section.center {
    justify-content: center;
  }
  .header-section.right {
    justify-content: flex-end;
  }

  /* --- Estilos de la Marca --- */
  .brand-button {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--space-sm);
    transition: background-color 0.2s ease;
    color: var(--color-text);
  }

  .brand-button:hover {
    background-color: var(--color-gray-100);
  }

  .logo-wrapper {
    display: grid;
    place-items: center;
    transition: transform 0.3s ease;
  }

  .brand-button:hover .logo-wrapper {
    transform: rotate(-15deg) scale(1.1);
  }

  .brand-name {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
    letter-spacing: -0.03em;
  }

  .accent-word {
    color: var(--color-accent);
  }

  /* --- Estilos del Tooltip de Ayuda --- */

  /* *** INICIO DE LA SOLUCIÓN: NUEVOS ESTILOS PARA EL TOOLTIP *** */
  :global(.shortcuts) {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-xs);
  }

  :global(.shortcut-item) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--space-lg);
  }

  :global(.keys) {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  :global(.shortcuts kbd) {
    font-family: var(--font-main);
    font-size: 0.75rem;
    font-weight: 600;
    background-color: var(--color-gray-100);
    color: var(--color-text);
    padding: 3px 6px;
    border-radius: 6px;
    border: 1px solid var(--color-gray-200);
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  }
  /* *** FIN DE LA SOLUCIÓN *** */

  @media (max-width: 768px) {
    .desktop-only-tooltip {
      display: none;
    }
  }

  @media (prefers-color-scheme: dark) {
    .app-header {
      border-bottom-color: var(--color-gray-100);
    }
    :global(.shortcuts kbd) {
      background-color: var(--color-gray-200);
      border-color: var(--color-gray-500);
      color: var(--color-text);
    }
  }
</style>
