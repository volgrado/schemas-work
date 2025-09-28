<!-- src/lib/components/layout/WelcomeScreen.svelte (SOLUCIÓN FINAL DE ESTILOS) -->
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
      <h1 class="title">Schemas.Work</h1>
      <p class="subtitle">Un jardín para cultivar tus ideas.</p>
    </header>

    <main class="features-grid">
      <div class="feature">
        <Icon name="sparkles" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">Piensa. Estructura. Aprende.</h2>
          <p>
            Transforma texto en bruto en esquemas claros con ayuda de la IA, y
            convierte esos esquemas en conocimiento profundo con tarjetas de
            estudio interactivas.
          </p>
        </div>
      </div>

      <div class="feature">
        <Icon name="lock" size={24} />
        <div class="feature-text">
          <h2 class="feature-title">Tu Conocimiento es Tuyo. Siempre.</h2>
          <p>
            Esta aplicación funciona 100% en tu navegador. Tus datos nunca salen
            de tu dispositivo. Son encriptados por ti y solo accesibles para ti.
          </p>
        </div>
      </div>
    </main>

    <footer class="footer">
      <Button on:click={handleStart} size="lg" variant="primary">
        Comenzar a Cultivar
      </Button>
    </footer>
  </div>
</div>

<style>
  /* *** LA CORRECCIÓN FINAL *** */
  /* WelcomeContainer ahora es un contenedor transparente que ocupa el 100% de su padre (Animator) */
  .welcome-container {
    /* Eliminamos position, inset, z-index y background-color */
    width: 100%;
    height: 100%;

    /* Mantenemos la lógica de centrado */
    display: grid;
    place-items: center;
    padding: var(--space-md);

    /* Mantenemos el overflow para que el canvas no se desborde */
    overflow: hidden;
  }

  /* El resto de los estilos no necesitan cambios, ya que son relativos al .welcome-container */
  .content-panel {
    position: relative;
    z-index: 2; /* Se apila sobre el OrganicCanvas */
    width: 100%;
    max-width: 580px;
    display: flex;
    flex-direction: column;
    gap: var(--space-xxl);
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

  .subtitle {
    font-size: 1.25rem;
    color: var(--color-gray-500);
    margin-top: var(--space-sm);
    font-weight: 400;
  }

  .features-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .feature {
    display: flex;
    text-align: left;
    align-items: flex-start;
    gap: var(--space-md);
  }

  .feature-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 var(--space-xs) 0;
  }

  .feature-text p {
    margin: 0;
    line-height: 1.7;
    color: var(--color-text);
  }

  @media (max-width: 640px) {
    .title {
      font-size: 2.2rem;
    }
    .subtitle {
      font-size: 1.1rem;
    }
  }

  /* La animación de salida sigue funcionando porque es controlada por la clase global */
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
