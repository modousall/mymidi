/**
 * @fileoverview This file initializes the Genkit AI instance.
 * It is not marked with 'use server' and can be safely imported into server-side components.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  // Log all telemetry to the console.
  logSinks: ['console'],
  // Prevent telemetry from being sent to the cloud.
  telemetry: {
    instrumentation: 'none',
  },
});
