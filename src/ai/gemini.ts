import type { GenerateContentRequest } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

async function geminiFetch(requestBody: GenerateContentRequest) {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${error}`);
  }

  return response.json();
}

export async function geminiGenerate(
  prompt: string,
  jsonMode: boolean = false
) {
  const requestBody: GenerateContentRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  if (jsonMode) {
    requestBody.generationConfig = {
      responseMimeType: 'application/json',
    };
  }

  const data = await geminiFetch(requestBody);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return 'No response from Gemini';
  }

  if (jsonMode) {
    // The response is a JSON string, so parse it before returning
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Failed to parse JSON response from Gemini');
    }
  }

  return text;
}
