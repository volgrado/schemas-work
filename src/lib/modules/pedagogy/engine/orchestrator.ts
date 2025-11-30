
/**
 * Cognitive Orchestrator
 * Implements the POMDP Policy and Action Selection logic.
 */

import type { PedagogicalPolicy } from '../domain/models';
import { POMDP_CONSTANTS } from '../domain/constants';

/**
 * Updates the POMDP Belief State based on the latest action and reward.
 * 
 * @param policy The current policy state.
 * @param action The action that was taken.
 * @param reward The reward received (0.0 - 1.0).
 * @returns A new PedagogicalPolicy with the updated belief vector.
 */
export function updateBeliefState(policy: PedagogicalPolicy, action: string, reward: number): PedagogicalPolicy {
  const newState = [...policy.stateVector];
  
  const KNOWLEDGE_IDX = POMDP_CONSTANTS.KNOWLEDGE_STATE_INDEX;
  const FLOW_IDX = POMDP_CONSTANTS.FLOW_STATE_INDEX;
  const MOTIVATION_IDX = 1; // Assuming index 1 is Motivation

  // Bayesian-like Update Heuristic:
  
  if (reward > POMDP_CONSTANTS.REWARD_THRESHOLD_HIGH) {
    // High Reward:
    // 1. Increase Knowledge Belief (We have evidence of mastery)
    newState[KNOWLEDGE_IDX] = Math.min(1.0, newState[KNOWLEDGE_IDX] + 0.1);
    
    // 2. Increase Flow Belief (User is likely in the zone)
    newState[FLOW_IDX] = Math.min(1.0, newState[FLOW_IDX] + 0.1);
    
    // 3. Boost Motivation (Success breeds motivation)
    newState[MOTIVATION_IDX] = Math.min(1.0, newState[MOTIVATION_IDX] + 0.05);

  } else if (reward < POMDP_CONSTANTS.REWARD_THRESHOLD_LOW) {
    // Low Reward:
    // 1. Decrease Flow Belief (Likely anxiety or boredom/apathy)
    newState[FLOW_IDX] = Math.max(0.0, newState[FLOW_IDX] - 0.1);
    
    // 2. Knowledge belief might not decrease (a mistake doesn't mean they forgot),
    // but certainty might decrease. For now, we leave it or slightly decay.
  }

  // Natural Decay of Motivation over time (Entropy)
  newState[MOTIVATION_IDX] = Math.max(0.0, newState[MOTIVATION_IDX] - 0.01);

  return {
    ...policy,
    stateVector: newState
  };
}

/**
 * Selects the optimal pedagogical action to minimize Free Energy (Surprise)
 * and maximize Flow.
 * 
 * @param policy The current policy with belief state.
 * @returns The ID of the action to take.
 */
export function selectOptimalAction(policy: PedagogicalPolicy): string {
  const [knowledge, motivation, flow] = policy.stateVector;

  // Policy Logic (The "Brain's" Decision Tree):

  // 1. ANXIETY STATE (Low Knowledge, Low Flow)
  // Strategy: Scaffold & Support
  if (flow < 0.4 && knowledge < 0.4) {
    // Prefer scaffolding actions
    const scaffoldAction = policy.actionSpace.find(a => a.includes('scaffold'));
    return scaffoldAction || 'scaffold_generic';
  }
  
  // 2. BOREDOM STATE (High Knowledge, Low Flow)
  // Strategy: Challenge & Complicate
  if (flow < 0.4 && knowledge > 0.7) {
    // Prefer challenge actions
    const challengeAction = policy.actionSpace.find(a => a.includes('challenge'));
    return challengeAction || 'challenge_generic';
  }

  // 3. APATHY STATE (Low Motivation)
  // Strategy: Switch Context or Gamify
  if (motivation < 0.3) {
    return 'switch_strand'; // Change the activity type (Nation's Strands)
  }

  // 4. FLOW STATE (Optimal)
  // Strategy: Continue & Maintain
  return 'present_new';
}
