
'use server';

/**
 * @fileOverview A Smart Payment Security Assistant flow that analyzes recipient alias/account details and provides security suggestions.
 *
 * - paymentSecurityAssistant - A function that handles the security analysis process.
 * - PaymentSecurityAssistantInput - The input type for the paymentSecurityAssistant function.
 * - PaymentSecurityAssistantOutput - The return type for the paymentSecurityAssistant function.
 */
import { z } from 'zod';
import { aiGenerate } from '@/ai/ai-wrapper';

const PaymentSecurityAssistantInputSchema = z.object({
  recipientAlias: z.string().describe('The alias of the payment recipient.'),
  recipientAccountDetails: z.string().describe('The account details of the payment recipient.'),
  amount: z.number().describe('The amount to be transferred.'),
  transactionType: z.string().describe('The type of transaction (e.g., payment, transfer).'),
});
export type PaymentSecurityAssistantInput = z.infer<typeof PaymentSecurityAssistantInputSchema>;

const PaymentSecurityAssistantOutputSchema = z.object({
  securitySuggestions: z.array(
    z.string().describe('A list of security suggestions or warnings.')
  ).describe('A list of security suggestions based on the recipient and transaction details.'),
  isHighRisk: z.boolean().describe('Indicates whether the transaction is considered high risk.'),
});
export type PaymentSecurityAssistantOutput = z.infer<typeof PaymentSecurityAssistantOutputSchema>;

export async function paymentSecurityAssistant(input: PaymentSecurityAssistantInput): Promise<PaymentSecurityAssistantOutput> {

  const prompt = `Vous êtes un assistant de sécurité des paiements intelligent. Votre rôle est d'analyser les détails d'une transaction de paiement et de fournir des suggestions de sécurité à l'utilisateur pour l'aider à éviter les escroqueries ou les paiements incorrects.

Analysez les détails du destinataire et de la transaction suivants:

Alias du destinataire: ${input.recipientAlias}
Détails du compte du destinataire: ${input.recipientAccountDetails}
Montant: ${input.amount}
Type de transaction: ${input.transactionType}

Fournissez une liste de suggestions de sécurité à l'utilisateur. Ces suggestions doivent inclure des avertissements sur les escroqueries potentielles, des vérifications d'informations incorrectes et tout autre conseil de sécurité pertinent. De plus, en fonction des détails fournis, déterminez si la transaction présente un risque élevé et définissez le champ "isHighRisk" en conséquence.

Tenez compte de facteurs tels que l'alias du destinataire, les détails du compte, le montant de la transaction et le type de transaction lors de la génération de vos suggestions.
Si l'alias du destinataire ressemble à un numéro de téléphone ou à une adresse e-mail qui n'est pas dans un format standard, avertissez l'utilisateur.
Si le destinataire est "Nouveau" ou n'est pas dans la liste de contacts, avertissez l'utilisateur de vérifier qu'il connaît le destinataire et que l'alias est correct.

La sortie doit être un objet JSON valide avec les clés "securitySuggestions" (un tableau de chaînes) et "isHighRisk" (un booléen).
`;
  
  const result = await aiGenerate(prompt, true);
  return PaymentSecurityAssistantOutputSchema.parse(result);
}
