/**
 * AI Connector Service
 * Interfaces with LLMs (e.g., OpenAI, Anthropic) for content generation.
 */

import { z } from 'zod';
import type { ContentGenerator, CEFRLevel } from '../domain/models';
import * as aiService from '$lib/modules/ai/aiService';
import { getNextAvailableKey, settingsState } from '$lib/modules/settings/ui/settingsStore.svelte';
import { getModelById } from '$lib/modules/ai/aiModels';
import { WebLLMProvider } from '$lib/modules/ai/providers/WebLLMProvider';

export interface IAIService {
  /**
   * Generates content based on a generator configuration and context.
   */
  generateContent(generator: ContentGenerator, context: Record<string, string>): Promise<string>;

  /**
   * Validates if the generated content meets the CEFR level requirements.
   */
  validateContent(content: string, level: CEFRLevel): Promise<boolean>;

  /**
   * Generates a chat response for the tactical interface.
   */
  generateChatResponse(history: { role: 'user' | 'system'; content: string }[], context: string): Promise<string>;
}

/**
 * Hybrid AI Service
 * Uses the real AI service if an API key is available, otherwise falls back to local templates.
 */
export class HybridAIService implements IAIService {
  
  private getApiKey(): string | null {
    const keyData = getNextAvailableKey('gemini');
    return keyData ? keyData.key : null;
  }

  private getModel() {
    return getModelById(settingsState.selectedModelId);
  }

  async generateContent(generator: ContentGenerator, context: Record<string, string>): Promise<string> {
    const apiKey = this.getApiKey();
    
    if (apiKey && generator.source === 'gpt') {
      try {
        // Construct prompt from template and context
        let prompt = generator.template;
        for (const [key, value] of Object.entries(context)) {
          prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
        }

        const responseSchema = z.object({
          content: z.string()
        });

        const result = await aiService.generateContent(
          [{ role: 'user', parts: [{ text: prompt }] }],
          this.getModel(),
          apiKey,
          responseSchema
        );

        return result.content;
      } catch (e) {
        console.warn("AI generation failed, falling back to local template:", e);
      }
    }

    // Fallback: Local Template Logic
    let content = generator.template;
    for (const [key, value] of Object.entries(context)) {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    
    // Simulate delay if local
    if (!apiKey) await new Promise(resolve => setTimeout(resolve, 20));
    
    return content;
  }

  async validateContent(content: string, level: CEFRLevel): Promise<boolean> {
    // For now, simple length check. Could use AI to validate if key exists.
    return content.length > 0;
  }

  async generateChatResponse(history: { role: 'user' | 'system'; content: string }[], context: string): Promise<string> {
    // 1. Try Local AI (WebLLM) first
    const localProvider = WebLLMProvider.getInstance();
    if (localProvider.isReady()) {
      try {
        const systemPrompt = `You are a language tutor for the "Sovereign Learner" system.
Context: ${context}

Instructions:
- Respond to the user's last message.
- Keep it concise, encouraging, and helpful.
- If the user completes the task, acknowledge it.
- Do NOT output JSON. Output plain text.`;

        // Construct full prompt for local model (which usually expects a specific chat format, but streamResponse handles messages internally if we pass them right, 
        // OR we just concatenate for now as WebLLMProvider.generateResponse takes a string prompt. 
        // Actually WebLLMProvider.generateResponse takes a prompt and wraps it in a user message. 
        // For a chat history, we might need to extend WebLLMProvider to accept a message array, but for now let's just send the last message with system context prepended.)
        
        const lastUserMsg = history[history.length - 1]?.content || "";
        const fullPrompt = `${systemPrompt}\n\nUser: ${lastUserMsg}\nAssistant:`;
        
        // Use generateResponse (non-streaming for now to match interface, or we could stream if we change the interface)
        // The interface returns Promise<string>, so non-streaming is fine.
        return await localProvider.generateResponse(fullPrompt);

      } catch (e) {
        console.error("Local AI generation failed, falling back to Cloud:", e);
      }
    }

    // 2. Fallback to Cloud AI (Gemini)
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const systemPrompt = `You are a language tutor for the "Sovereign Learner" system. 
        Context: ${context}
        
        Respond to the user's last message. Keep it concise, encouraging, and helpful. 
        If the user completes the task, acknowledge it.
        Do NOT output JSON. Output plain text.`;

        // Filter out system messages from history to avoid confusing the model
        const validHistory = history.filter(msg => msg.role !== 'system');

        const messages: aiService.AiMessage[] = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...validHistory.map(msg => ({
            role: msg.role === 'system' ? 'model' : 'user', // Should not happen due to filter, but safe fallback
            parts: [{ text: msg.content }]
          } as aiService.AiMessage))
        ];

        // Use plain text generation (no schema)
        // We pass undefined for the schema to indicate plain text mode.
        const result = await aiService.generateContent(
          messages,
          this.getModel(),
          apiKey,
          undefined
        );

        return result; // Result is string
      } catch (e) {

        console.error("AI Chat generation failed:", e);
        return "I'm having trouble connecting to my neural network. (AI Error)";
      }
    }

    // 3. Fallback Mock Response
    await new Promise(resolve => setTimeout(resolve, 1000));
    const lastUserMsg = history[history.length - 1]?.content.toLowerCase() || "";
    
    if (lastUserMsg.includes("hello") || lastUserMsg.includes("hi")) {
      return "Greetings, learner. Ready to proceed?";
    } else if (lastUserMsg.includes("done") || lastUserMsg.includes("complete")) {
      return "Excellent work. Task verification complete.";
    } else {
      return "I understand. Please continue with the mission objectives.";
    }
  }
}
