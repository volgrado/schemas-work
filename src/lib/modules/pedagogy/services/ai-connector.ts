/**
 * AI Connector Service
 * Interfaces with LLMs (e.g., OpenAI, Anthropic) for content generation.
 */

import { z } from 'zod';
import type { ContentGenerator, CEFRLevel } from '../domain/models';
import * as aiService from '$lib/modules/ai/aiService';
import { getNextAvailableKey, settingsState } from '$lib/modules/settings/ui/settingsStore.svelte';
import { getModelById } from '$lib/modules/ai/aiModels';

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
    const apiKey = this.getApiKey();

    if (apiKey) {
      try {
        const systemPrompt = `You are a language tutor for the "Sovereign Learner" system. 
        Context: ${context}
        
        Respond to the user's last message. Keep it concise, encouraging, and helpful. 
        If the user completes the task, acknowledge it.
        Return your response as a JSON object with a 'message' field.`;

        const messages: aiService.AiMessage[] = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...history.map(msg => ({
            role: msg.role === 'system' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          } as aiService.AiMessage))
        ];

        const responseSchema = z.object({
          message: z.string()
        });

        const result = await aiService.generateContent(
          messages,
          this.getModel(),
          apiKey,
          responseSchema
        );

        return result.message;
      } catch (e) {
        console.error("AI Chat generation failed:", e);
        return "I'm having trouble connecting to my neural network. (AI Error)";
      }
    }

    // Fallback Mock Response
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
