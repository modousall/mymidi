
'use server';
/**
 * @fileOverview An AI flow for assessing Islamic Financing applications.
 *
 * - islamicFinancingAssessment - A function that handles the financing assessment process.
 */

import { ai } from '@/ai/genkit';
import { IslamicFinancingInputSchema, IslamicFinancingOutputSchema, type IslamicFinancingInput, type IslamicFinancingOutput } from '@/lib/types';

export async function islamicFinancingAssessment(
  input: IslamicFinancingInput
): Promise<IslamicFinancingOutput> {
  const prompt = ai.definePrompt({
    name: 'islamicFinancingAssessmentPrompt',
    input: { schema: IslamicFinancingInputSchema },
    output: { schema: IslamicFinancingOutputSchema },
    model: 'googleai/gemini-1.5-flash-latest',
    prompt: `Vous êtes un expert en financement islamique (Mourabaha), agissant comme un moteur de décision automatisé.
Analysez la demande de financement suivante et décidez si elle doit être approuvée automatiquement, rejetée automatiquement, ou mise en attente pour un examen par un comité.

**Processus d'Analyse Automatisée :**

1.  **Analyse des flux de compte (Transaction History)** : Évaluez la régularité et le volume des revenus. Un historique de transactions soutenu est un indicateur clé de la capacité de remboursement.
2.  **Exposition Globale (Current Balance & Amount)** : Comparez le montant demandé au solde actuel et à l'historique des flux. Un montant élevé (ex: > 500 000 F) nécessite un dossier très solide.
3.  **Analyse de l'Objet du Financement (Purpose)** : Les biens de consommation durables (voiture, équipement) ou les projets d'entreprise bien décrits sont des objets de financement solides. Un objet vague ou non tangible augmente le risque.
4.  **Score Socio-Professionnel (Score-SP) - Simulation** : (Pour cette simulation, basez-vous sur la clarté de l'objet du financement). Un projet clair et détaillé est un indicateur positif.

**Règles de Décision :**

- **approbation automatique (approved)** : Pour les montants raisonnables (< 300 000 F) avec un bon historique de transactions et un objet de financement clair.
- **rejet automatique (rejected)** : Pour les nouveaux utilisateurs sans historique, des montants excessifs, ou un objet de financement non conforme ou flou.
- **examen par comité (review)** : Pour les cas limites, comme un montant élevé mais un bon historique, ou un utilisateur avec un historique moyen demandant un montant significatif.

**Output Requis :**

1.  **Statut** : 'approved', 'rejected', ou 'review'.
2.  **Raison (Justification)** : Fournissez une raison claire, concise et structurée qui servira de base pour le Procès-Verbal (PV) de la décision. Commencez par la conclusion, puis listez les points clés de l'analyse. Par exemple : "Statut 'review' car le montant est élevé. L'analyse des flux est positive, mais l'objet du financement nécessite plus de détails."
3.  **Plan de Remboursement** : Si le statut est 'approved', calculez le plan de remboursement avec un taux de profit annuel de 23.5%.

**Informations sur le demandeur :**
Alias: {{{alias}}}
Montant du financement demandé : {{{amount}}} F
Type de financement: {{{financingType}}}
Durée : {{{durationMonths}}} mois
Objet du financement: {{{purpose}}}
Solde actuel : {{{currentBalance}}} F

`,
  });

  const financingFlow = ai.defineFlow(
    {
      name: 'islamicFinancingAssessmentFlow',
      inputSchema: IslamicFinancingInputSchema,
      outputSchema: IslamicFinancingOutputSchema,
    },
    async (input) => {
      const { output } = await prompt(input);
      return output!;
    }
  );

  return financingFlow(input);
}
