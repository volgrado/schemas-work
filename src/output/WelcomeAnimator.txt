<!-- src/lib/components/layout/WelcomeAnimator.svelte (SOLUCIÓN FINAL SIMPLE Y ROBUSTA) -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import WelcomeScreen from './WelcomeScreen.svelte';

  const dispatch = createEventDispatcher();

  // 1. Un único estado para controlar toda la secuencia de salida.
  let isExiting = false;

  function handleStart() {
    // 2. Al hacer clic, activamos el estado, lo que añade la clase '.exiting' al wrapper.
    isExiting = true;

    // 3. Establecemos un temporizador que coincide con la duración total de nuestras
    //    animaciones CSS. Cuando termina, notificamos a la página principal
    //    que la transición ha finalizado.
    setTimeout(() => {
      dispatch('animationComplete');
    }, 1500); // 1.5 segundos, que es la duración de la animación más larga.
  }
</script>

<div class="animator-wrapper" class:exiting={isExiting}>
  <!-- 
    Pasamos 'isExiting' como prop a WelcomeScreen.
    WelcomeScreen, a su vez, se la pasará a OrganicCanvas.
    Esto permite que los estilos de los componentes hijos reaccionen en cascada.
  -->
  <WelcomeScreen on:start={handleStart} {isExiting} />

  <!-- 
    Este es el lienzo que se "despliega" para crear el fondo del editor.
    Su animación también se activa por la clase '.exiting' del padre.
  -->
  <div class="unfurling-canvas"></div>
</div>

<style>
  .animator-wrapper {
    position: fixed;
    inset: 0;
    z-index: 200;
    /* El fondo inicial es el del tema actual (claro u oscuro). */
    background-color: var(--color-background);
    /* Importante para que el canvas de despliegue no se desborde */
    overflow: hidden;
  }

  /*
    Este es el círculo de color que "explota" para convertirse en el nuevo fondo.
  */
  .unfurling-canvas {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 2vw;
    height: 2vw;
    /* Por defecto, es blanco (para tema claro). */
    background-color: #ffffff;
    border-radius: 50%;
    /* Se posiciona detrás del contenido de WelcomeScreen para un efecto más limpio. */
    z-index: -1;
    /* Comienza invisible y escalado a cero. */
    transform: translate(-50%, -50%) scale(0);
  }

  /* --- La Magia de las Animaciones CSS en Cascada --- */

  /* Cuando el wrapper obtiene la clase '.exiting', esta animación se activa. */
  .exiting .unfurling-canvas {
    /* *** LA MEJORA *** */
    /* Le decimos al navegador que se prepare para animar 'transform'. */
    will-change: transform;
    animation: unfurl 0.8s ease-in-out 0.7s forwards;
  }

  @keyframes unfurl {
    from {
      transform: translate(-50%, -50%) scale(0);
    }
    to {
      /* Crece hasta ser enorme, cubriendo toda la pantalla. */
      transform: translate(-50%, -50%) scale(100);
    }
  }

  /* Adaptamos el color del lienzo de despliegue para el modo oscuro. */
  @media (prefers-color-scheme: dark) {
    .unfurling-canvas {
      background-color: var(--color-background);
    }
  }
</style>
