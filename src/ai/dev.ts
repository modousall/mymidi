
import { config } from 'dotenv';
config();

// This file is the entrypoint for the Genkit developer UI.
// It imports all the flow files, so they can be discovered by Genkit.
import '@/ai/flows/payment-security-assistant.ts';
import '@/ai/flows/alias-suggestion-flow.ts';
import '@/ai/flows/bill-payment-assistant.ts';
import '@/ai/flows/bnpl-assessment-flow.ts';
import '@/ai/flows/islamic-financing-flow.ts';
import '@/ai/flows/send-email-flow.ts';
