'use server';
/**
 * @fileOverview A simple wrapper for making AI generation calls.
 */

import { geminiGenerate } from './gemini';

/**
 * A simple wrapper around the geminiGenerate function.
 * @param prompt The text prompt to send to the AI.
 * @param jsonMode Whether to expect a JSON response.
 * @returns The generated text response or parsed JSON object.
 */
export async function aiGenerate(prompt: string, jsonMode: boolean = false) {
  try {
    return await geminiGenerate(prompt, jsonMode);
  } catch (error) {
    console.error('Gemini failed, this is a placeholder for a fallback like OpenAI', error);
    // In a real app, you might have a fallback to another model.
    if (jsonMode) {
        return { error: "AI service failed" };
    }
    return "AI service is currently unavailable.";
  }
}
