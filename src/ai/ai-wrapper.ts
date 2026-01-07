'use server';
/**
 * @fileOverview A simple wrapper for making AI generation calls.
 */

import { geminiModel } from './gemini';

/**
 * A simple wrapper around the geminiModel.generateContent method.
 * @param prompt The text prompt to send to the AI.
 * @returns The generated text response.
 */
export async function aiGenerate(prompt: string): Promise<string> {
  const result = await geminiModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  });

  return result.response.text();
}
