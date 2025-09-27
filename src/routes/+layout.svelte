<script lang="ts">
  // Importamos el ADN visual de nuestra aplicación.
  // Al hacerlo en el layout raíz, nos aseguramos de que estos estilos
  // estén disponibles globalmente en cada página.
  import '$lib/styles/app.css';
</script>

<!--
  El componente <slot /> es un marcador de posición especial de SvelteKit.
  Aquí es donde se renderizará el contenido de la página actual 
  (por ejemplo, +page.svelte) o de layouts anidados.
-->
<slot />