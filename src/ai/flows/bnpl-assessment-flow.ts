
'use server';
/**
 * @fileOverview An AI flow for assessing BNPL (Buy Now, Pay Later) applications.
 *
 * - assessBnplApplication - A function that handles the BNPL assessment process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { BnplAssessmentInputSchema, BnplAssessmentOutputSchema, type BnplAssessmentInput, type BnplAssessmentOutput } from '@/lib/types';


export async function assessBnplApplication(
  input: BnplAssessmentInput
): Promise<BnplAssessmentOutput> {
  const prompt = ai.definePrompt({
    name: 'bnplAssessmentPrompt',
    input: { schema: BnplAssessmentInputSchema },
    output: { schema: BnplAssessmentOutputSchema },
    model: 'googleai/gemini-1.5-flash-latest',
    prompt: `Vous êtes un expert en évaluation de crédit pour un service financier en Afrique de l'Ouest, agissant comme un moteur de décision automatisé.
Analysez la demande de "Credit Marchands" (BNPL) suivante et décidez si elle doit être approuvée automatiquement, rejetée automatiquement, ou mise en attente pour un examen par un comité.

**Processus d'Analyse Automatisée :**

1.  **Analyse des flux de compte (Transaction History)** :
    - Évaluez la régularité et le volume des revenus (transactions de type "received"). Un historique positif est un indicateur fort.
    - Un utilisateur sans historique ou avec des flux très faibles représente un risque élevé.

2.  **Exposition Globale et Solde (Current Balance & Purchase Amount)** :
    - Comparez le montant de l'achat au solde actuel. Un solde très bas par rapport à l'achat augmente le risque.
    - Si le montant de l'achat est très élevé (ex: > 150 000 Fcfa), soyez plus prudent. Une avance (down payment) significative (>20%) réduit ce risque.

3.  **Score Socio-Professionnel (Score-SP) - Simulation** :
    - (Pour cette simulation, basez ce score sur l'alias) Si l'alias est un simple numéro de téléphone, considérez le score neutre. Si c'est un alias personnalisé, considérez-le comme un léger bonus.

**Règles de Décision :**

- **approbation automatique (approved)** : Pour les montants raisonnables (< 100 000 Fcfa) avec un bon historique de transactions et un risque global faible.
- **rejet automatique (rejected)** : Pour les nouveaux utilisateurs sans historique, les montants clairement excessifs sans justification, ou un risque global jugé trop élevé.
- **examen par comité (review)** : Pour les cas limites. Par exemple : montant élevé mais bon historique, utilisateur récent avec un montant modéré, ou des conditions de crédit inhabituelles.

**Output Requis :**

1.  **Statut** : 'approved', 'rejected', ou 'review'.
2.  **Raison (Justification)** : Fournissez une raison claire, concise et structurée qui servira de base pour le Procès-Verbal (PV) de la décision. Commencez par la conclusion, puis listez les points clés de l'analyse. Par exemple : "Statut 'review' car le montant est élevé malgré un bon historique. Analyse des flux positive. Exposition globale modérée."
3.  **Plan de Remboursement** : Si le statut est 'approved', calculez et fournissez le plan de remboursement.

**Informations sur le demandeur :**
Alias: {{{alias}}}
Montant de l'achat : {{{purchaseAmount}}} Fcfa
Avance versée : {{#if downPayment}}{{{downPayment}}} Fcfa{{else}}0 Fcfa{{/if}}
Solde actuel : {{{currentBalance}}} Fcfa
Nombre d'échéances: {{{installmentsCount}}}
Périodicité de remboursement: {{{repaymentFrequency}}}
Date de première échéance: {{{firstInstallmentDate}}}
Taux de marge: {{{marginRate}}}% par période

`,
  });

  const bnplAssessmentFlow = ai.defineFlow(
    {
      name: 'bnplAssessmentFlow',
      inputSchema: BnplAssessmentInputSchema,
      outputSchema: BnplAssessmentOutputSchema,
    },
    async (input) => {
      const { output } = await prompt(input);
      return output!;
    }
  );

  return bnplAssessmentFlow(input);
}
    
