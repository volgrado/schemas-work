
/**
 * Predictive Processing Engine
 * Implements Active Inference and Deep Knowledge Tracing (DKT).
 */

import type { DKTModel } from '../domain/models';

/**
 * Simulates Deep Knowledge Tracing (DKT) prediction.
 * 
 * In a production environment, this would interface with an ONNX runtime or 
 * a Python microservice running the actual LSTM/Transformer model.
 * 
 * @param dkt The DKT model configuration.
 * @param interactionHistory Sequence of past interactions (correct/incorrect).
 * @returns The predicted probability of mastery for the next step (Hidden State).
 */
export function predictNextState(dkt: DKTModel, interactionHistory: { correct: boolean }[]): number[] {
  // Heuristic Implementation: Exponential Moving Average (EMA)
  // This approximates the "hidden state" of knowledge without a full neural network.
  // It gives more weight to recent interactions, modeling the "Recency Effect".
  
  if (interactionHistory.length === 0) {
    // Cold start: Return neutral probability (0.5)
    return new Array(dkt.embeddingSize).fill(0.5);
  }

  const alpha = 0.3; // Smoothing factor (0 < alpha < 1). Higher = faster adaptation.
  let ema = 0.5; // Initial belief

  for (const interaction of interactionHistory) {
    const outcome = interaction.correct ? 1.0 : 0.0;
    ema = alpha * outcome + (1 - alpha) * ema;
  }
  
  // The hidden state represents the latent knowledge state.
  const hiddenState = new Array(dkt.embeddingSize).fill(0);
  hiddenState[0] = ema; 
  
  return hiddenState;
}

/**
 * Calculates the Prediction Error (Surprise).
 * Used to drive the Free Energy minimization loop.
 */
export function calculatePredictionError(expected: number, actual: number): number {
  return Math.abs(expected - actual);
}
