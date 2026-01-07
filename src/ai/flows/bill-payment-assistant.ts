
'use server';
/**
 * @fileOverview An AI assistant for validating bill payments.
 *
 * - billPaymentAssistant - A function that validates bill payment details.
 * - BillPaymentAssistantInput - The input type for the function.
 * - BillPaymentAssistantOutput - The return type for the function.
 */
import type { BillPaymentAssistantInput, BillPaymentAssistantOutput } from '@/lib/types';
import { BillPaymentAssistantOutputSchema } from '@/lib/types';
import { openaiGenerate } from '@/ai/openai';

export async function billPaymentAssistant(input: BillPaymentAssistantInput): Promise<BillPaymentAssistantOutput> {

  const prompt = `Vous êtes un assistant de paiement de factures pour un service financier en Afrique de l'Ouest.
Analysez les détails de paiement de facture suivants et fournissez des conseils à l'utilisateur.

Service: ${input.service}
Identifiant: ${input.identifier}
Montant: ${input.amount} Fcfa

Vérifications à effectuer:
1.  Format de l'identifiant: L'identifiant est-il dans un format plausible pour le service donné ? (Par exemple, un numéro de contrat SENELEC a généralement un certain format).
2.  Montant: Le montant semble-t-il raisonnable pour ce type de facture ? S'il est très bas (ex: < 500 Fcfa) ou très élevé (ex: > 200 000 Fcfa), signalez-le.
3.  Fournissez des suggestions utiles. Par exemple, "Veuillez vérifier que le numéro de police correspond bien à votre facture." ou "Le montant semble inhabituellement élevé, veuillez confirmer qu'il est correct."

Renvoyez un objet JSON avec 'isValid' (true si tout semble correct, false sinon) et une liste de 'suggestions'.
`;

  const result = await openaiGenerate(prompt);
  return BillPaymentAssistantOutputSchema.parse(JSON.parse(result));
}
