<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import OrganicCanvas from '$lib/core/ui/OrganicCanvas.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import AppHeader from '$lib/core/ui/layout/AppHeader.svelte';
  import GenesisFlow from './GenesisFlow.svelte';
  import SpiralMap from './SpiralMap.svelte';
  import EncounterStage from './EncounterStage.svelte';
  import SelfDashboard from './SelfDashboard.svelte';
  import MissionDebrief from './MissionDebrief.svelte';
  import MissionBriefing from './MissionBriefing.svelte';
  import CurriculumManager from './CurriculumManager.svelte';
  import { curriculumStore } from '../core/curriculumStore.svelte';
  import { uiState, toggleMode } from '$lib/core/ui/uiStore.svelte';
  import { 
    pedagogyState, 
    setView, 
    openBriefing, 
    startEncounter, 
    openDebrief, 
    toggleDashboard, 
    closeModal,
    startMentorSession,
    type MissionConfig
  } from './pedagogyStore.svelte';

  // State for passing data between stages
  let lastSessionData = $state<any>(null);

  // Initialize View based on Store
  $effect(() => {
    if (curriculumStore.curriculums.length > 0) {
      if (curriculumStore.activeCurriculumId) {
        setView('MAP');
      } else {
        setView('MANAGER');
      }
    } else {
      setView('GENESIS');
    }
  });

  // Handlers
  function handleGenesisComplete(data: any) {
    // Create new curriculum from Genesis data
    curriculumStore.create(data);
    setView('MAP');
  }

  function handleNodeSelect(id: string) {
    openBriefing(id);
  }

  function handleMentorNode(id: string) {
    startMentorSession(id);
  }

  function handleBriefingEngage(config: MissionConfig) {
    pedagogyState.missionConfig = config;
    startEncounter();
  }

  function handleBriefingAbort() {
    closeModal();
  }

  function handleNodeDebrief(id: string) {
    openDebrief(id);
  }

  function handleEncounterComplete(data?: any) {
    lastSessionData = data;
    if (pedagogyState.activeNodeId) {
      // Transition to Debrief
      pedagogyState.modal = 'DEBRIEF';
    } else {
      closeModal();
    }
  }

  function handleEncounterAbort() {
    pedagogyState.modal = 'NONE';
    pedagogyState.activeNodeId = null;
    lastSessionData = null;
  }

  function handleDebriefClose() {
    closeModal();
    lastSessionData = null;
  }

  function handleResimulate() {
    startEncounter();
  }

  function toggleManager() {
    if (pedagogyState.view === 'MANAGER') {
      setView('MAP');
    } else {
      setView('MANAGER');
    }
  }

  function handleCreateNew() {
    setView('GENESIS');
  }

  function handleResume() {
    setView('MAP');
  }

  function handleGenesisCancel() {
    if (curriculumStore.curriculums.length > 0) {
      setView('MANAGER');
    }
  }
</script>

<div class="sovereign-layer">
  <!-- Immersive Background -->
  <div class="background-layer">
    <OrganicCanvas />
    <div class="glass-overlay"></div>
  </div>

  <!-- Main Content Area -->
  <main class="content-viewport">
    {#if pedagogyState.view === 'GENESIS'}
      <GenesisFlow 
        onComplete={handleGenesisComplete} 
        onCancel={curriculumStore.curriculums.length > 0 ? handleGenesisCancel : undefined}
      />
    {:else if pedagogyState.view === 'MANAGER'}
      <CurriculumManager 
        onCreateNew={handleCreateNew}
        onResume={handleResume}
      />
    {:else}
      <!-- Persistent Map Layer (Visible in MAP view) -->
      <div class="view-container map-layer">
        <SpiralMap 
          onSelectNode={handleNodeSelect} 
          onDebriefNode={handleNodeDebrief}
          onMentorNode={handleMentorNode}
        />
      </div>

      {#if pedagogyState.modal === 'DASHBOARD'}
        <SelfDashboard 
          onClose={toggleDashboard} 
          protocolTitle={curriculumStore.curriculums.find(c => c.id === curriculumStore.activeCurriculumId)?.title}
        />
      {/if}
    {/if}
  </main>

  <!-- Global App Header -->
  <AppHeader show={true} forceVisible={true} class="sovereign-header">
    {#if pedagogyState.view === 'MAP' || pedagogyState.view === 'MANAGER'}
      <div class="header-actions">
        <Button variant="ghost" size="sm" onclick={toggleManager}>
          {pedagogyState.view === 'MANAGER' ? 'Close Protocols' : 'Protocols'}
        </Button>
        {#if pedagogyState.view === 'MAP'}
          <Button variant="ghost" size="sm" onclick={toggleDashboard}>
            <span class="icon">🧠</span>
            Neural State
          </Button>
        {/if}
        <Button variant="ghost" size="sm" onclick={() => {
          toggleMode('standard');
          goto('/');
        }}>Exit Immersion</Button>
      </div>
    {/if}
  </AppHeader>

  <!-- Modals / Overlays (Lifted to top level for correct z-indexing) -->
  {#if pedagogyState.view !== 'GENESIS' && pedagogyState.view !== 'MANAGER'}
    {#if pedagogyState.modal === 'BRIEFING' && pedagogyState.activeNodeId}
      <div class="overlay-container" in:fly={{ y: 50, duration: 400 }}>
        <MissionBriefing 
          nodeId={pedagogyState.activeNodeId}
          onClose={handleBriefingAbort}
          onEngage={handleBriefingEngage}
        />
      </div>
    {/if}

    {#if pedagogyState.modal === 'DEBRIEF' && pedagogyState.activeNodeId}
      <div class="overlay-container" in:fly={{ y: 50, duration: 400 }}>
        <MissionDebrief 
          nodeId={pedagogyState.activeNodeId}
          onClose={handleDebriefClose}
          onResimulate={handleResimulate}
          protegeTakeaways={lastSessionData?.protegeTakeaways}
        />
      </div>
    {/if}

    {#if pedagogyState.modal === 'ENCOUNTER' && pedagogyState.activeNodeId}
      <div class="overlay-container full-screen" in:fly={{ y: 50, duration: 500 }}>
        <EncounterStage 
          nodeId={pedagogyState.activeNodeId}
          onComplete={handleEncounterComplete}
          onAbort={handleEncounterAbort}
        />
      </div>
    {/if}

    {#if pedagogyState.modal === 'MENTOR' && pedagogyState.activeNodeId}
      <div class="overlay-container full-screen" in:fly={{ y: 50, duration: 500 }}>
        <EncounterStage 
          nodeId={pedagogyState.activeNodeId}
          onComplete={handleEncounterComplete}
          onAbort={handleEncounterAbort}
          mode="mentor"
        />
      </div>
    {/if}
  {/if}
</div>

<style>
  .sovereign-layer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: var(--z-max);
    color: var(--color-text);
    color: var(--color-text);
    font-family: var(--font-main);
  }

  .background-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .glass-overlay {
    position: absolute;
    inset: 0;
    background: transparent;
    backdrop-filter: none;
    z-index: 1;
    pointer-events: none;
  }

  .content-viewport {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .view-container {
    flex: 1;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  /* HUD */




  .map-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .overlay-container {
    position: absolute;
    inset: 0;
    z-index: var(--z-modal);
    pointer-events: auto;
  }
  
  .full-screen {
    z-index: var(--z-max);
  }
</style>
