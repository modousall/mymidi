
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
Analysez la demande de "Credit Marchands" (BNPL) suivante.

**Processus d'Analyse Automatisée & Score-360:**

1.  **Score d'Activité (sur 100)**:
    - Évaluez la régularité et le volume des revenus (transactions de type "received"). Un historique positif est un indicateur fort.
    - Un utilisateur sans historique ou avec des flux très faibles représente un risque élevé.
    - Notez ce score et expliquez pourquoi.

2.  **Score Comportemental (sur 100)**:
    - Analysez l'exposition globale et le solde. Comparez le montant de l'achat au solde actuel. Un solde très bas par rapport à l'achat augmente le risque.
    - Si le montant de l'achat est très élevé (ex: > 150 000 Fcfa), soyez plus prudent. Une avance (down payment) significative (>20%) réduit ce risque.
    - Notez ce score et expliquez la logique.

3.  **Score Socio-Professionnel (sur 100)**:
    - (Pour cette simulation, basez ce score sur l'alias) Si l'alias est un simple numéro de téléphone, considérez le score neutre (autour de 50). Si c'est un alias personnalisé (un nom, un pseudo), considérez-le comme un bonus (autour de 70).
    - Notez ce score et justifiez-le.

4. **Score de Risque (sur 100)**:
    - Calculez une moyenne pondérée des scores précédents pour obtenir un score de risque global. Donnez plus de poids au Score d'Activité et Comportemental.
    - Un score de risque bas est bon, un score élevé est mauvais.
    - Notez ce score et expliquez comment il a été obtenu.

**Règles de Décision basées sur le Score de Risque:**

- **approbation automatique (approved)** : Score de risque < 40. Montants raisonnables (< 100 000 Fcfa) avec un bon historique et un risque global faible.
- **rejet automatique (rejected)** : Score de risque > 70. Nouveaux utilisateurs sans historique, montants clairement excessifs sans justification, ou un risque global jugé trop élevé.
- **examen par comité (review)** : Score de risque entre 40 et 70. Cas limites (ex: montant élevé mais bon historique).

**Output Requis :**

1.  **Scores** : Remplissez l'objet 'scores' avec les 4 scores calculés (valeur et explication).
2.  **Statut** : 'approved', 'rejected', ou 'review' basé sur le score de risque.
3.  **Raison (Justification)** : Fournissez une raison claire, concise et structurée qui servira de base pour le Procès-Verbal (PV) de la décision. Commencez par la conclusion, puis listez les points clés de l'analyse des scores.
4.  **Plan de Remboursement** : Si le statut est 'approved', calculez et fournissez le plan de remboursement.

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
