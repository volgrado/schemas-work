import { HybridAIService } from '../services/ai-connector';
import type { Scenario, ActionOrientedTask, CEFRLevel, LessonContent } from '../domain/models';
import { getModelById } from '$lib/modules/ai/aiModels';
import * as aiService from '$lib/modules/ai/aiService';
import { z } from 'zod';
import { getNextAvailableKey, settingsState } from '$lib/modules/settings/ui/settingsStore.svelte';
import { analytics } from '$lib/modules/analytics/AnalyticsService';

const MANIFESTO_SUMMARY = `
THE SOVEREIGN LEARNER MANIFESTO:
1. Active Inference: The system models the learner.
2. Action-Oriented: Language is for DOING. Missions, not just drills.
3. Dynamic Systems: Inject chaos to force phase transitions.
4. Symbol Grounding: Link words to sensory data.
5. Psychometrics: Calibrate difficulty precisely.
`;

export class AiCurriculumGenerator {
  
  /**
   * Returns a prioritized list of models to try.
   * 1. User's selected model (if valid/available).
   * 2. Gemini 2.5 Pro (State-of-the-art Reasoning).
   * 3. Gemini 2.5 Flash (High Speed Fallback).
   * 4. Gemini 1.5 Pro (Legacy Fallback).
   */
  private getModelChain() {
    const selectedId = settingsState.selectedModelId;
    const selectedModel = getModelById(selectedId);
    
    const chain = [];
    if (selectedModel) chain.push(selectedModel);
    
    // Prioritize Flash models for efficiency and rate limits
    const flash25 = getModelById('gemini-2.5-flash');
    if (flash25 && flash25.id !== selectedId) chain.push(flash25);

    const flash15 = getModelById('gemini-1.5-flash');
    if (flash15 && flash15.id !== selectedId) chain.push(flash15);
    
    // Add Pro models as fallbacks for complex tasks if Flash fails
    const pro25 = getModelById('gemini-2.5-pro');
    if (pro25 && pro25.id !== selectedId) chain.push(pro25);

    const pro15 = getModelById('gemini-1.5-pro-latest');
    if (pro15 && pro15.id !== selectedId) chain.push(pro15);
    
    return chain;
  }

  private getApiKey(): string | null {
    const keyObj = getNextAvailableKey('gemini');
    return keyObj ? keyObj.key : null;
  }

  /**
   * Generates a full Scenario (Macro-Task) with fallback strategy.
   */
  async generateScenario(topic: string, level: CEFRLevel): Promise<Scenario> {
    const apiKey = this.getApiKey();
    // Note: Local models don't need an API key, but Cloud ones do. 
    // We'll check inside the loop or assume if user selected Cloud, they have a key.

    const prompt = `
    You are the Architect of the "Sovereign Learner" system.
    Generate a pedagogical SCENARIO for the topic: "${topic}" at CEFR Level: ${level}.
    
    STRICTLY FOLLOW THE MANIFESTO:
    ${MANIFESTO_SUMMARY}
    
    The Scenario must include:
    - A real-world domain (Occupational, Personal, Public, Educational).
    - A sequence of Action-Oriented Tasks (Missions).
    - Psychometric calibration (difficulty, discrimination).
    
    Output JSON format matching this interface:
    {
      "id": "string",
      "title": "string",
      "domain": "occupational" | "personal" | "public" | "educational",
      "description": "string",
      "sequencing": "linear" | "spiral" | "modular",
      "tasks": [
        {
          "id": "string",
          "description": "string",
          "context": "string (The situation)",
          "role": "string (Who the learner is)",
          "outcome": "string (What must be achieved)",
          "criteria": ["string"],
          "digitalMedium": "chat" | "video_call" | "forum" | "email" | "collab_doc",
          "psychometrics": { "difficultyIndex": number (0-1), "discriminationIndex": number (0-1), "exposureCount": 0 }
        }
      ]
    }
    `;

    const scenarioSchema = z.object({
      id: z.string(),
      title: z.string(),
      domain: z.enum(['occupational', 'personal', 'public', 'educational']),
      description: z.string(),
      sequencing: z.enum(['linear', 'spiral', 'modular']),
      tasks: z.array(z.object({
        id: z.string(),
        description: z.string(),
        context: z.string(),
        role: z.string(),
        outcome: z.string(),
        criteria: z.array(z.string()),
        digitalMedium: z.enum(['chat', 'video_call', 'forum', 'email', 'collab_doc']).optional(),
        psychometrics: z.object({
          difficultyIndex: z.number(),
          discriminationIndex: z.number(),
          exposureCount: z.number()
        })
      }))
    });

    const models = this.getModelChain();
    let lastError;

    for (const model of models) {
      const startTime = Date.now();
      try {
        console.log(`Attempting Curriculum Generation with model: ${model.name}`);
        
        // Skip Cloud models if no key
        if (model.provider === 'gemini' && !apiKey) {
          console.warn(`Skipping ${model.name} (No API Key)`);
          continue;
        }

        const result = await aiService.generateContent(
          [{ role: 'user', parts: [{ text: prompt }] }],
          model,
          apiKey || '', // Local models ignore this
          scenarioSchema
        );
        
        analytics.track('AI_LATENCY', { 
          operation: 'generateScenario', 
          model: model.name, 
          duration: Date.now() - startTime 
        });

        return result as Scenario; // Cast is safe due to Zod validation
      } catch (e) {
        console.warn(`Model ${model.name} failed:`, e);
        analytics.track('ERROR', { 
          source: 'AiCurriculumGenerator', 
          model: model.name, 
          error: (e as Error).message || String(e)
        });
        lastError = e;
        // Continue to next model
      }
    }

    throw lastError || new Error("All models failed to generate curriculum.");
  }

  /**
   * Generates a full Scenario with streaming feedback.
   * @param onProgress Callback receiving the partial scenario or specific updates (e.g. "Found task: X")
   */
  async generateScenarioStream(
    topic: string, 
    level: CEFRLevel,
    onProgress: (status: string) => void
  ): Promise<Scenario> {
    const apiKey = this.getApiKey();
    const prompt = `
    You are the Architect of the "Sovereign Learner" system.
    Generate a pedagogical SCENARIO for the topic: "${topic}" at CEFR Level: ${level}.
    
    STRICTLY FOLLOW THE MANIFESTO:
    ${MANIFESTO_SUMMARY}
    
    Output JSON format matching this interface:
    {
      "id": "string",
      "title": "string",
      "domain": "occupational" | "personal" | "public" | "educational",
      "description": "string",
      "sequencing": "linear" | "spiral" | "modular",
      "tasks": [
        {
          "id": "string",
          "description": "string",
          "context": "string",
          "role": "string",
          "outcome": "string",
          "criteria": ["string"],
          "digitalMedium": "chat" | "video_call" | "forum" | "email" | "collab_doc",
          "psychometrics": { "difficultyIndex": number, "discriminationIndex": number, "exposureCount": 0 }
        }
      ]
    }
    `;

    const models = this.getModelChain();
    let lastError;

    for (const model of models) {
      try {
        if (model.provider === 'gemini' && !apiKey) continue;

        console.log(`Streaming Curriculum with model: ${model.name}`);
        onProgress(`Connecting to ${model.name}...`);

        let fullJson = '';
        let taskCount = 0;

        await aiService.streamContent(
          [{ role: 'user', parts: [{ text: prompt }] }],
          model,
          apiKey || '',
          (chunk) => {
            fullJson += chunk;
            
            // Simple heuristic to detect progress in JSON
            // We look for "description": "..." inside "tasks" array
            // This is a rough approximation without a streaming JSON parser
            const matches = fullJson.match(/"description":\s*"([^"]+)"/g);
            if (matches && matches.length > taskCount + 1) { // +1 for main description
               // Found new tasks
               const newCount = matches.length - 1;
               if (newCount > taskCount) {
                 // Extract the last description found
                 const lastDesc = matches[matches.length - 1];
                 const cleanDesc = lastDesc.replace(/"description":\s*"/, '').replace(/"$/, '');
                 onProgress(`Identified Mission: ${cleanDesc.substring(0, 30)}...`);
                 taskCount = newCount;
               }
            }
          }
        );

        // Final Parse
        try {
          const result = JSON.parse(fullJson);
          return result as Scenario;
        } catch (e) {
          console.error("JSON Parse Error on Stream Final:", e);
          throw new Error("Generated content was not valid JSON.");
        }

      } catch (e) {
        console.warn(`Model ${model.name} failed stream:`, e);
        lastError = e;
      }
    }

    throw lastError || new Error("All models failed to generate curriculum.");
  }

  /**
   * Generates the "System Prompt" with fallback strategy.
   */
  async generateMissionContext(task: ActionOrientedTask): Promise<string> {
    const apiKey = this.getApiKey();
    const models = this.getModelChain();
    let lastError;

    const prompt = `
    You are the Architect.
    Generate a SYSTEM PROMPT for a Local AI Agent that will act as the counterpart in a roleplay mission.
    
    Mission: ${task.description}
    Role: ${task.role}
    Context: ${task.context}
    Outcome: ${task.outcome}
    
    The System Prompt must:
    - Define the AI's persona (e.g., Shopkeeper, Interviewer).
    - Set the tone and register.
    - Define success criteria (when to congratulate the user).
    - Include "Manifesto" elements: Be reactive, challenge the user if they are too comfortable (perturbation), or scaffold if they struggle.
    
    Output ONLY the raw text of the System Prompt.
    `;

    const responseSchema = z.object({
      systemPrompt: z.string()
    });

    for (const model of models) {
      try {
        // Skip Cloud models if no key
        if (model.provider === 'gemini' && !apiKey) continue;

        const result = await aiService.generateContent(
          [{ role: 'user', parts: [{ text: prompt + "\nReturn JSON: { \"systemPrompt\": \"...\" }" }] }],
          model,
          apiKey || '',
          responseSchema
        );
        return result.systemPrompt;
      } catch (e) {
        console.warn(`Model ${model.name} failed context generation:`, e);
        lastError = e;
      }
    }

    throw lastError || new Error("All models failed to generate mission context.");
  }

  /**
   * Generates the full Lesson Content (Assimil Style).
   */
  async generateLessonContent(task: ActionOrientedTask): Promise<LessonContent> {
    const apiKey = this.getApiKey();
    const models = this.getModelChain();
    let lastError;

    const prompt = `
    You are the Architect of the "Sovereign Learner" system.
    Generate a COMPLETE LESSON (Assimil Style) for the mission: "${task.description}".
    
    Context: ${task.context}
    Role: ${task.role}
    Outcome: ${task.outcome}
    
    The Lesson must include:
    1. **Dialogue**: A realistic conversation (8-12 lines) relevant to the mission. Bilingual (Target + Native). 
       - Suggest a "voiceId" for each speaker.
       - **CRITICAL**: Insert footnote markers like [1], [2] in the "target" text for interesting words or grammar.
    2. **Footnotes**: Explanations for the markers [1], [2] etc.
    3. **Phonetics**: 3-5 key sounds or pronunciation challenges.
    4. **Vocabulary**: Key terms with definitions.
    5. **Grammar**: 2-3 specific grammar points.
    6. **Exercises**: 3-4 exercises (cloze, matching, choice).
    
    Output JSON format:
    {
      "dialogue": [
        { "speaker": "string", "target": "Bonjour [1]!", "native": "Hello!", "voiceId": "string" }
      ],
      "footnotes": [
        { "id": 1, "word": "Bonjour", "note": "Standard greeting." }
      ],
      "phonetics": [
        { "sound": "string", "ipa": "string", "description": "string" }
      ],
      "vocabulary": [
        { "term": "string", "definition": "string", "context": "string" }
      ],
      "grammar": [
        { "rule": "string", "explanation": "string", "examples": ["string"] }
      ],
      "exercises": [
        {
          "id": "string",
          "type": "translation" | "fill_blank" | "matching" | "reorder" | "choice" | "cloze",
          "prompt": "string",
          "options": ["string"] (optional),
          "correctAnswer": "string" | ["string"],
          "explanation": "string"
        }
      ]
    }
    `;

    const lessonSchema = z.object({
      dialogue: z.array(z.object({
        speaker: z.string(),
        target: z.string(),
        native: z.string(),
        voiceId: z.string().optional()
      })),
      footnotes: z.array(z.object({
        id: z.number(),
        word: z.string(),
        note: z.string()
      })),
      phonetics: z.array(z.object({
        sound: z.string(),
        ipa: z.string(),
        description: z.string()
      })),
      vocabulary: z.array(z.object({
        term: z.string(),
        definition: z.string(),
        context: z.string()
      })),
      grammar: z.array(z.object({
        rule: z.string(),
        explanation: z.string(),
        examples: z.array(z.string())
      })),
      exercises: z.array(z.object({
        id: z.string(),
        type: z.enum(['translation', 'fill_blank', 'matching', 'reorder', 'choice', 'cloze']),
        prompt: z.string(),
        options: z.array(z.string()).optional(),
        correctAnswer: z.union([z.string(), z.array(z.string())]),
        explanation: z.string()
      }))
    });

    for (const model of models) {
      try {
        if (model.provider === 'gemini' && !apiKey) continue;

        const result = await aiService.generateContent(
          [{ role: 'user', parts: [{ text: prompt }] }],
          model,
          apiKey || '',
          lessonSchema
        );
        return result as LessonContent;
      } catch (e) {
        console.warn(`Model ${model.name} failed lesson generation:`, e);
        lastError = e;
      }
    }

    throw lastError || new Error("All models failed to generate lesson content.");
  }


  /**
   * Generates sub-tasks to expand a specific node in the curriculum.
   */
  async expandCurriculumNode(parentTask: ActionOrientedTask): Promise<ActionOrientedTask[]> {
    const apiKey = this.getApiKey();
    const models = this.getModelChain();
    
    const prompt = `
    You are the Architect.
    The learner has mastered the mission: "${parentTask.description}".
    Generate 2-3 SUB-MISSIONS that branch off from this point to deepen their skills.
    
    Parent Context: ${parentTask.context}
    Parent Outcome: ${parentTask.outcome}
    
    The sub-missions should be:
    1. More specific or advanced variations.
    2. Related pragmatic skills (e.g., if parent was "Buying Bread", sub-mission is "Complaining about stale bread").
    
    Output JSON format:
    {
      "tasks": [
        {
          "id": "string (unique suffix)",
          "description": "string",
          "context": "string",
          "role": "string",
          "outcome": "string",
          "criteria": ["string"],
          "digitalMedium": "chat",
          "psychometrics": { "difficultyIndex": number, "discriminationIndex": number, "exposureCount": 0 }
        }
      ]
    }
    `;

    const responseSchema = z.object({
      tasks: z.array(z.object({
        id: z.string(),
        description: z.string(),
        context: z.string(),
        role: z.string(),
        outcome: z.string(),
        criteria: z.array(z.string()),
        digitalMedium: z.enum(['chat', 'video_call', 'forum', 'email', 'collab_doc']).optional(),
        psychometrics: z.object({
          difficultyIndex: z.number(),
          discriminationIndex: z.number(),
          exposureCount: z.number()
        })
      }))
    });

    for (const model of models) {
      try {
        if (model.provider === 'gemini' && !apiKey) continue;

        const result = await aiService.generateContent(
          [{ role: 'user', parts: [{ text: prompt }] }],
          model,
          apiKey || '',
          responseSchema
        );
        
        // Post-process IDs to ensure uniqueness and linkage
        return result.tasks.map(t => ({
          ...t,
          id: `${parentTask.id}-sub-${crypto.randomUUID().substring(0, 4)}`,
          // We don't have a 'parentId' field in ActionOrientedTask, 
          // but the UI uses 'parents' array in NodeData.
          // The mapping logic in SpiralMap needs to know the parent.
          // We can encode it in the ID or handle it in the UI layer.
          // Let's rely on the UI layer passing the parent ID when calling this.
        })) as ActionOrientedTask[];

      } catch (e) {
        console.warn(`Model ${model.name} failed expansion:`, e);
      }
    }

    return [];
  }
  /**
   * Generates a Standard CEFR Curriculum (A1-C2) for a given language pair.
   */
  async generateStandardCurriculum(targetLang: string, baseLang: string): Promise<Scenario> {
    const apiKey = this.getApiKey();
    const models = this.getModelChain();
    let lastError;

    const prompt = `
    You are the Architect of the "Sovereign Learner" system.
    Generate a STANDARD PEDAGOGICAL CURRICULUM for learning ${targetLang} (Target) from ${baseLang} (Base).
    
    The curriculum must cover CEFR levels from A1 to C1/C2.
    It should be structured as a sequence of "Action-Oriented Tasks" (Missions), not just grammar drills.
    
    STRICTLY FOLLOW THE MANIFESTO:
    ${MANIFESTO_SUMMARY}
    
    Output JSON format matching this interface:
    {
      "id": "standard-${targetLang}",
      "title": "Standard ${targetLang} Protocol",
      "domain": "public",
      "description": "A complete path to mastery in ${targetLang}.",
      "sequencing": "spiral",
      "tasks": [
        {
          "id": "string (unique)",
          "description": "string (Mission Title - MAX 3-5 WORDS)",
          "context": "string (The situation)",
          "role": "string (Who the learner is)",
          "outcome": "string (What must be achieved)",
          "criteria": ["string"],
          "digitalMedium": "chat",
          "psychometrics": { "difficultyIndex": number (0.1 for A1 to 0.9 for C2), "discriminationIndex": 0.5, "exposureCount": 0 }
        }
      ]
    }
    
    Generate at least 15-20 key missions spanning the levels.
    IMPORTANT: Keep "description" (Mission Title) very short and punchy (e.g. "Buy Train Ticket", "Negotiate Salary").
    `;

    const scenarioSchema = z.object({
      id: z.string(),
      title: z.string(),
      domain: z.enum(['occupational', 'personal', 'public', 'educational']),
      description: z.string(),
      sequencing: z.enum(['linear', 'spiral', 'modular']),
      tasks: z.array(z.object({
        id: z.string(),
        description: z.string(),
        context: z.string(),
        role: z.string(),
        outcome: z.string(),
        criteria: z.array(z.string()),
        digitalMedium: z.enum(['chat', 'video_call', 'forum', 'email', 'collab_doc']).optional(),
        psychometrics: z.object({
          difficultyIndex: z.number(),
          discriminationIndex: z.number(),
          exposureCount: z.number()
        })
      }))
    });

    for (const model of models) {
      try {
        if (model.provider === 'gemini' && !apiKey) continue;

        console.log(`Generating Standard Curriculum with model: ${model.name}`);
        const result = await aiService.generateContent(
          [{ role: 'user', parts: [{ text: prompt }] }],
          model,
          apiKey || '',
          scenarioSchema
        );
        return result as Scenario;
      } catch (e) {
        console.warn(`Model ${model.name} failed standard generation:`, e);
        lastError = e;
      }
    }

    throw lastError || new Error("All models failed to generate standard curriculum.");
  }

  /**
   * Generates a Custom Curriculum based on user prompt.
   */
  async generateCustomCurriculum(userPrompt: string, targetLang: string, baseLang: string): Promise<Scenario> {
    const apiKey = this.getApiKey();
    const models = this.getModelChain();
    let lastError;

    const prompt = `
    You are the Architect of the "Sovereign Learner" system.
    Generate a CUSTOM PEDAGOGICAL CURRICULUM for learning ${targetLang} (Target) from ${baseLang} (Base).
    
    User Intent/Focus: "${userPrompt}"
    
    The curriculum must be tailored to this intent but still structured as a sequence of Action-Oriented Tasks.
    
    STRICTLY FOLLOW THE MANIFESTO:
    ${MANIFESTO_SUMMARY}
    
    Output JSON format matching this interface:
    {
      "id": "custom-${targetLang}-${Date.now()}",
      "title": "Custom Protocol: ${userPrompt.substring(0, 20)}...",
      "domain": "personal",
      "description": "A custom path focused on: ${userPrompt}",
      "sequencing": "spiral",
      "tasks": [
        {
          "id": "string (unique)",
          "description": "string (Mission Title - MAX 3-5 WORDS)",
          "context": "string",
          "role": "string",
          "outcome": "string",
          "criteria": ["string"],
          "digitalMedium": "chat",
          "psychometrics": { "difficultyIndex": number, "discriminationIndex": 0.5, "exposureCount": 0 }
        }
      ]
    }
    
    Generate at least 10-15 key missions.
    IMPORTANT: Keep "description" (Mission Title) very short and punchy (e.g. "Buy Train Ticket", "Negotiate Salary").
    `;

    const scenarioSchema = z.object({
      id: z.string(),
      title: z.string(),
      domain: z.enum(['occupational', 'personal', 'public', 'educational']),
      description: z.string(),
      sequencing: z.enum(['linear', 'spiral', 'modular']),
      tasks: z.array(z.object({
        id: z.string(),
        description: z.string(),
        context: z.string(),
        role: z.string(),
        outcome: z.string(),
        criteria: z.array(z.string()),
        digitalMedium: z.enum(['chat', 'video_call', 'forum', 'email', 'collab_doc']).optional(),
        psychometrics: z.object({
          difficultyIndex: z.number(),
          discriminationIndex: z.number(),
          exposureCount: z.number()
        })
      }))
    });

    for (const model of models) {
      try {
        if (model.provider === 'gemini' && !apiKey) continue;

        console.log(`Generating Custom Curriculum with model: ${model.name}`);
        const result = await aiService.generateContent(
          [{ role: 'user', parts: [{ text: prompt }] }],
          model,
          apiKey || '',
          scenarioSchema
        );
        return result as Scenario;
      } catch (e) {
        console.warn(`Model ${model.name} failed custom generation:`, e);
        lastError = e;
      }
    }

    throw lastError || new Error("All models failed to generate custom curriculum.");
  }
}
