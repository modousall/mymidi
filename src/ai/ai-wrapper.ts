'use server';
/**
 * @fileOverview A simple wrapper for making AI generation calls.
 */

import { geminiGenerate } from './gemini';
import { openaiGenerate } from './openai';

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
    console.error('Gemini failed → fallback OpenAI', error);
    if (jsonMode) {
      // OpenAI fallback needs to be adapted for JSON mode if needed.
      // For now, returning an error structure.
      console.error("OpenAI fallback does not support JSON mode currently.");
      return { error: "AI service failed to produce valid JSON." };
    }
    return await openaiGenerate(prompt);
  }
}
