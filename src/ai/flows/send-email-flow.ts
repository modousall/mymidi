
'use server';

/**
 * @fileOverview A flow for sending emails.
 *
 * This file defines a Genkit flow for sending emails. It includes a tool
 * that simulates sending an email for development and testing purposes.
 *
 * - sendEmail - A function to send an email with a specified subject, content, and recipient.
 * - EmailInput - The Zod schema for the sendEmail function's input.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the schema for the email input
export const EmailInputSchema = z.object({
  to: z.string().email().describe('The recipient\'s email address.'),
  subject: z.string().describe('The subject of the email.'),
  body: z.string().describe('The HTML or plain text content of the email.'),
});
export type EmailInput = z.infer<typeof EmailInputSchema>;

// Define a tool that simulates sending an email by logging to the console
const sendEmailTool = ai.defineTool(
  {
    name: 'sendEmail',
    description: 'A tool to send an email. For development, this logs the email to the console.',
    inputSchema: EmailInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    console.log('--- SIMULATING EMAIL ---');
    console.log(`To: ${input.to}`);
    console.log(`Subject: ${input.subject}`);
    console.log('Body:');
    console.log(input.body);
    console.log('------------------------');
    return {
      success: true,
      message: 'Email successfully simulated and logged to the console.',
    };
  }
);

// Define the main flow for sending emails
const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: EmailInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    const result = await sendEmailTool(input);
    return result;
  }
);

/**
 * Sends an email using the defined Genkit flow.
 * @param {EmailInput} input - The email details (to, subject, body).
 * @returns {Promise<{ success: boolean; message: string; }>} - The result of the send operation.
 */
export async function sendEmail(input: EmailInput): Promise<{ success: boolean; message: string; }> {
  return await sendEmailFlow(input);
}
