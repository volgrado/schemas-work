<!-- src/lib/components/layout/WelcomeScreen.svelte (VERSIÓN MEJORADA Y COMPLETA) -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import OrganicCanvas from '../ui/OrganicCanvas.svelte';

  export let isExiting = false;
  const dispatch = createEventDispatcher();

  function handleStart() {
    dispatch('start');
  }
</script>

<div class="welcome-container">
  <OrganicCanvas {isExiting} />

  <div class="content-panel">
    <header class="header">
      <h1 class="title">
        Schemas<span class="accent-word">.Work</span>
      </h1>
      <!-- CAMBIO: Subtítulo más evocador que alude a la conexión y crecimiento de ideas. -->
      <p class="subtitle">
        Donde tus ideas echan raíces, se conectan y florecen.
      </p>
    </header>

    <!-- CAMBIO: La parrilla de características ha sido reescrita y expandida para cubrir más funcionalidades clave. -->
    <main class="features-grid">
      <div class="feature">
        <Icon name="sparkles" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">Estructura con IA</h2>
          <p>
            Transforma texto en bruto en esquemas jerárquicos y expande tus
            nodos con nuevas ideas usando el asistente de IA.
          </p>
        </div>
      </div>

      <div class="feature">
        <Icon name="git-branch" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">Visualiza tus Conexiones</h2>
          <p>
            Explora tu conocimiento como un árbol de ideas interactivo,
            revelando la estructura profunda de tus esquemas de un vistazo.
          </p>
        </div>
      </div>

      <div class="feature">
        <Icon name="zap" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">Aprende de Verdad</h2>
          <p>
            Genera tarjetas de estudio y memoriza conceptos clave con un sistema
            de repetición espaciada (SRS) integrado.
          </p>
        </div>
      </div>

      <div class="feature">
        <Icon name="lock" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">Tu Conocimiento es Tuyo</h2>
          <p>
            Funciona 100% en tu navegador, sin servidores. Realiza copias de
            seguridad de todo tu trabajo con encriptación protegida por tu
            propia contraseña.
          </p>
        </div>
      </div>
    </main>

    <footer class="footer">
      <Button on:click={handleStart} size="lg" variant="primary">
        Comenzar a Cultivar
      </Button>
      <!-- CAMBIO: Texto de apoyo que crea una transición suave a la aplicación. -->
      <p class="cta-support-text">
        Tu primer lienzo, "Mi Primer Esquema", te está esperando.
      </p>
    </footer>
  </div>
</div>

<style>
  .welcome-container {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    padding: var(--space-lg);
    box-sizing: border-box; /* Asegura que el padding se incluya en el tamaño total */
    overflow-y: auto; /* CORRECCIÓN: Permite el scroll vertical si el contenido es demasiado alto */
  }

  .content-panel {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    animation: fadeIn 1s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .header,
  .footer {
    text-align: center;
  }

  .title {
    font-family: var(--font-main);
    font-size: 2.8rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    margin: 0;
  }

  .accent-word {
    color: var(--color-accent);
  }

  .subtitle {
    font-size: 1.25rem;
    color: var(--color-gray-500);
    margin-top: var(--space-sm);
    font-weight: 400;
    max-width: 450px;
    margin-left: auto;
    margin-right: auto;
  }

  .features-grid {
    display: grid;
    gap: var(--space-xl);
  }

  @media (min-width: 640px) {
    .features-grid {
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg) var(--space-xl);
    }
    .content-panel {
      gap: var(--space-xxl);
    }
  }

  .feature {
    display: flex;
    text-align: left;
    align-items: flex-start;
    gap: var(--space-md);
  }

  .feature :global(svg) {
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .feature-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 var(--space-xs) 0;
  }

  .feature-text {
    min-width: 0;
  }

  .feature-text p {
    margin: 0;
    line-height: 1.6;
    color: var(--color-text);
    overflow-wrap: break-word;
    word-wrap: break-word;
  }

  .cta-support-text {
    font-size: 0.85rem;
    color: var(--color-gray-500);
    margin-top: var(--space-sm);
  }

  @media (max-width: 640px) {
    .title {
      font-size: 2.2rem;
    }
    .subtitle {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 480px) {
    .feature {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-sm);
    }

    .title {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }
  }

  :global(.exiting) .content-panel {
    will-change: opacity, transform;
    animation: fadeOutUp 0.7s ease-in forwards;
  }

  @keyframes fadeOutUp {
    to {
      opacity: 0;
      transform: translateY(-20px);
    }
  }
</style>
