<!--
  @component LanguageImmersiveLayer
  @description
  The "God-Level" Overlay. This component lives ON TOP of the standard editor.
  It contains the Genie Orb, the Knowledge Garden visualization, and the Gamified Lesson View.
-->
<script lang="ts">
  import { uiState, toggleMode } from '$lib/core/ui/uiStore.svelte';
  import { fade } from 'svelte/transition';

  // Placeholder for high-fidelity visualization
</script>

<div
  class="immersive-layer"
  transition:fade={{ duration: 300 }}
>
  <!-- Background Blur is handled by CSS -->

  <div class="content-container">
    <div class="header">
      <h1 class="logo">Schemas.Work <span class="badge">Language</span></h1>
      <button class="exit-btn" onclick={() => toggleMode('standard')}>
        Exit to Architect Mode
      </button>
    </div>

    <div class="garden-area">
      <!-- The D3 Tree visualization projected as a Garden -->
      <!-- Placeholder as per plan -->
      <div class="placeholder-text">Knowledge Garden Visualization</div>
    </div>

    <div class="orb-area">
      <div class="genie-placeholder">
        <div class="orb"></div>
        <p>How can I help you learn Greek today?</p>
      </div>
    </div>
  </div>
</div>

<style>
  .immersive-layer {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(10, 10, 15, 0.90);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
    color: white;
  }

  .content-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
      font-size: 1.5rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 0.5rem;
  }

  .badge {
      background: #a855f7;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      text-transform: uppercase;
  }

  .exit-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px 16px;
    border-radius: 20px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
  }
  .exit-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .garden-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed rgba(255,255,255,0.1);
    margin: 2rem 0;
    border-radius: 12px;
  }

  .placeholder-text {
      color: rgba(255,255,255,0.3);
      font-style: italic;
  }

  .orb-area {
    height: 150px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .genie-placeholder {
    text-align: center;
  }

  .orb {
    width: 60px;
    height: 60px;
    background: radial-gradient(circle, #a855f7, #6366f1);
    border-radius: 50%;
    margin: 0 auto 1rem;
    box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
    animation: pulse 3s infinite ease-in-out;
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }
</style>
