/**
 * @file pedagogyStore.svelte.ts
 * @description
 * Centralized UI state management for the Pedagogy / Immersive Module.
 * Separates the "Background View" (Map, Manager) from "Modals/Overlays" (Briefing, Encounter).
 */

export type PedagogyView = 'GENESIS' | 'MAP' | 'MANAGER' | 'CURRICULUM';
export type PedagogyModal = 'NONE' | 'BRIEFING' | 'DEBRIEF' | 'ENCOUNTER' | 'MENTOR';

export interface PedagogyState {
  view: PedagogyView;
  modal: PedagogyModal;
  activeNodeId: string | null;
  // Context for the modal (e.g., specific mission data if not just ID)
  context: any | null;
  // Configuration for the active mission (set during Briefing)
  missionConfig: MissionConfig | null;
}

export interface MissionConfig {
  entropy: number;       // 0-1: Chaos level
  guidance: 'implicit' | 'explicit';
  intention: string;
}

const initialState: PedagogyState = {
  view: 'GENESIS',
  modal: 'NONE',
  activeNodeId: null,
  context: null,
  missionConfig: null
};

export const pedagogyState = $state<PedagogyState>({ ...initialState });

// --- Actions ---

/**
 * Sets the main background view.
 */
export function setView(view: PedagogyView) {
  pedagogyState.view = view;
  // Switching main view usually clears modals
  pedagogyState.modal = 'NONE';
}

/**
 * Opens the Mission Briefing modal for a specific node.
 */
export function openBriefing(nodeId: string) {
  pedagogyState.activeNodeId = nodeId;
  pedagogyState.modal = 'BRIEFING';
}

/**
 * Starts the Encounter (Full-screen modal).
 */
export function startEncounter() {
  pedagogyState.modal = 'ENCOUNTER';
}

/**
 * Starts the Mentor Session (The Protégé).
 */
export function startMentorSession(nodeId: string) {
  pedagogyState.activeNodeId = nodeId;
  pedagogyState.modal = 'MENTOR';
}

/**
 * Opens the Mission Debrief modal.
 */
export function openDebrief(nodeId: string) {
  pedagogyState.activeNodeId = nodeId;
  pedagogyState.modal = 'DEBRIEF';
}



/**
 * Closes any active modal.
 */
export function closeModal() {
  pedagogyState.modal = 'NONE';
  // We don't necessarily clear activeNodeId here in case we need it for animations,
  // but for now, let's keep it simple.
}

/**
 * Resets the entire store to initial state.
 */
export function reset() {
  Object.assign(pedagogyState, initialState);
}
