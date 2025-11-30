/**
 * Pedagogy Controller
 * 
 * The central nervous system for the Immersive Learning mode.
 * Manages the state of the current scenario, active task, and interfaces with the AI service.
 * Uses Svelte 5 Runes for reactivity.
 */

import { HybridAIService } from '../services/ai-connector';
import { curriculumStore, type Curriculum } from '../core/curriculumStore.svelte';
import { 
  generateScenario, 
  generateActionOrientedTask, 
  getNextRecommendedNode,
  seedCurriculumDatabase
} from '../curriculum/scheduler';
import { updateBeliefState, selectOptimalAction } from '../engine/orchestrator';
import type { 
  Scenario, 
  ActionOrientedTask, 
  PedagogicalPolicy, 
  CurriculumNode,
  CEFRLevel
} from '../domain/models';
import { analytics } from '$lib/modules/analytics/AnalyticsService';

class PedagogyController {
  // --- State ---
  
  /** The active curriculum (Protocol) */
  activeCurriculum = $state<Curriculum | null>(null);

  /** The current active scenario (Macro-Task) */
  currentScenario = $state<Scenario | null>(null);
  
  /** The specific task currently being engaged with */
  activeTask = $state<ActionOrientedTask | null>(null);
  
  /** The user's progress through the current scenario's tasks */
  taskIndex = $state<number>(0);

  /** The "Brain's" model of the learner (POMDP Belief State) */
  policy = $state<PedagogicalPolicy>({
    stateVector: [0.5, 0.8, 0.5], // [Knowledge, Motivation, Flow]
    actionSpace: ['present_new', 'scaffold', 'challenge', 'review'],
    rewardFunction: 'standard'
  });

  /** AI Service Instance */
  private aiService = new HybridAIService();

  // --- Actions ---

  /**
   * Loads a specific curriculum.
   */
  loadCurriculum(id: string) {
    curriculumStore.switch(id);
    this.activeCurriculum = curriculumStore.activeCurriculum || null;
  }

  /**
   * Initializes a new immersive session.
   */
  startSession(level: CEFRLevel = 'A1', domain: Scenario['domain'] = 'occupational'): void {
    if (!this.activeCurriculum) {
      console.warn("No active curriculum selected. Using default.");
    }

    // 1. Generate a Scenario
    this.currentScenario = generateScenario(domain, level);
    this.taskIndex = 0;
    
    // 2. Set the first task
    if (this.currentScenario.tasks.length > 0) {
      this.activeTask = this.currentScenario.tasks[0];
      analytics.track('MISSION_STARTED', { 
        taskId: this.activeTask.id, 
        scenarioId: this.currentScenario.id 
      });
    } else {
      // Fallback if empty
      const nodes = seedCurriculumDatabase();
      const node = nodes[0];
      this.activeTask = generateActionOrientedTask(node, 'mission');
    }

    console.log('Pedagogy Session Started:', this.currentScenario.title);
  }

  /**
   * Advances to the next task in the scenario.
   */
  nextTask() {
    if (!this.currentScenario) return;

    this.taskIndex++;
    
    if (this.taskIndex < this.currentScenario.tasks.length) {
      this.activeTask = this.currentScenario.tasks[this.taskIndex];
    } else {
      // Scenario Complete
      this.completeScenario();
    }
  }

  /**
   * Handles task completion and updates the belief state.
   */
  completeTask(performanceRating: number) { // 0.0 to 1.0
    if (!this.activeTask) return;

    // 1. Update Belief State (POMDP)
    // We assume 'performanceRating' is the reward signal
    this.policy = updateBeliefState(this.policy, 'complete_task', performanceRating);

    // 2. Mark as Mastered in Curriculum Store
    curriculumStore.markTaskMastered(this.activeTask.id);
    
    // 3. Track Analytics
    analytics.track('MISSION_COMPLETED', {
      taskId: this.activeTask.id,
      performance: performanceRating,
      duration: 0 // TODO: Track duration
    });

    // 4. Determine Next Action (Orchestrator)
    const nextAction = selectOptimalAction(this.policy);
    console.log('Orchestrator recommends:', nextAction);

    // 5. Execute Action (For now, just move next, but could branch)
    this.nextTask();
  }

  completeScenario() {
    console.log('Scenario Complete!');
    analytics.track('SCENARIO_COMPLETED', { scenarioId: this.currentScenario?.id });
    this.activeTask = null;
    // TODO: Show summary screen or generate next scenario
  }

  // --- AI Interactions ---

  /**
   * Requests a hint for the current task from the AI.
   */
  async requestHint(): Promise<string> {
    if (!this.activeTask) return "No active task.";

    const context = {
      task: this.activeTask.description,
      role: this.activeTask.role,
      outcome: this.activeTask.outcome
    };

    const generator = {
      source: 'gpt' as const,
      template: "Provide a helpful hint for a learner trying to {outcome} in the role of {role}. The task is: {task}. Keep it brief."
    };

    return await this.aiService.generateContent(generator, context);
  }

  /**
   * Analyzes user input for pragmatic appropriateness.
   */
  async analyzePragmatics(input: string): Promise<{ tone: string; advice: string }> {
    if (!input) return { tone: 'Neutral', advice: 'Waiting for input...' };

    // We use a specialized prompt for this
    const prompt = `Analyze the pragmatic tone of this text: "${input}". 
    Context: ${this.activeTask?.context || 'General conversation'}.
    Return JSON with 'tone' (one word) and 'advice' (one sentence).`;

    // For now, we'll use the chat interface as a proxy or direct generation if we had a structured tool.
    // Since generateContent returns string, we'll parse it or use a simple heuristic if AI fails.
    
    try {
        // This is a simplification. In a real implementation, we'd use a Zod schema with the AI service.
        // For this step, let's use the chat response as a flexible analyzer.
        const response = await this.aiService.generateChatResponse(
            [{ role: 'user', content: prompt }], 
            "You are a pragmatic analyst."
        );
        
        // Attempt to parse JSON from the response if the AI follows instructions
        try {
            const json = JSON.parse(response);
            return { tone: json.tone || 'Unknown', advice: json.advice || response };
        } catch {
            return { tone: 'AI Analysis', advice: response };
        }
    } catch (e) {
        return { tone: 'Error', advice: 'Could not analyze.' };
    }
  }

  /**
   * Generates a response for the chat interaction.
   */
  async generateResponse(input: string, history: { role: string, content: string }[]): Promise<string> {
    if (!this.activeTask) return "I am not sure what we are doing. (No active task)";

    const systemPrompt = `
      You are roleplaying as a character in a language learning scenario.
      
      SCENARIO CONTEXT: ${this.activeTask.context}
      YOUR ROLE: Not the learner. You are the interlocutor defined in the context.
      LEARNER'S ROLE: ${this.activeTask.role}
      LEARNER'S GOAL: ${this.activeTask.outcome}
      
      INSTRUCTIONS:
      - Stay in character.
      - Respond naturally to the learner.
      - If the learner makes a mistake, react as a native speaker would (confusion, correction, or ignoring it depending on your persona).
      - Do not break character to explain grammar unless your role is a teacher.
      - Keep responses concise (1-3 sentences) to encourage dialogue.
    `;

    const startTime = Date.now();
    try {
      // Construct messages array: System Prompt + History + New Input
      // Note: History usually includes the new input as the last user message, so we might not need to append 'input' if it's already in history.
      // Assuming 'history' contains the full conversation including the latest user message.
      
      // Pass history directly. The AI Service will handle the system prompt using the 'context' argument.
      const messages = history as any;

      const response = await this.aiService.generateChatResponse(messages, systemPrompt);
      
      analytics.track('AI_LATENCY', { 
        operation: 'chatResponse', 
        duration: Date.now() - startTime 
      });

      return response;
    } catch (e) {
      console.error("Chat Generation Failed:", e);
      analytics.track('ERROR', { source: 'PedagogyController.chat', error: (e as Error).message });
      return "I'm having trouble understanding. Can you say that again?";
    }
  }
}

export const pedagogyController = new PedagogyController();
