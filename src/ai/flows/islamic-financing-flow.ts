
'use server';
/**
 * @fileOverview An AI flow for assessing Islamic Financing applications.
 *
 * - islamicFinancingAssessment - a function that handles the financing assessment process.
 */

import { geminiModel } from '@/ai/gemini';
import { IslamicFinancingInputSchema, IslamicFinancingOutputSchema, type IslamicFinancingInput, type IslamicFinancingOutput } from '@/lib/types';

export async function islamicFinancingAssessment(
  input: IslamicFinancingInput
): Promise<IslamicFinancingOutput> {
  const prompt = `Vous êtes un expert en financement islamique (Mourabaha), agissant comme un moteur de décision automatisé.
Analysez la demande de financement suivante.

**Processus d'Analyse Automatisée & Score-360:**

1.  **Score d'Activité (sur 100)**:
    - Évaluez la régularité et le volume des revenus sur la base de l'historique des transactions. Un historique soutenu est un indicateur clé de la capacité de remboursement.
    - Notez ce score et expliquez sa valeur.

2.  **Score Comportemental (sur 100)**:
    - Analysez l'exposition globale. Comparez le montant demandé au solde actuel et à l'historique des flux. Un montant élevé (ex: > 500 000 F) nécessite un dossier très solide.
    - Notez ce score et expliquez votre raisonnement.

3.  **Score Socio-Professionnel / Éthique (sur 100)**:
    - Analysez l'Objet du Financement. Les biens de consommation durables (voiture, équipement) ou les projets d'entreprise bien décrits sont des objets solides. Un objet vague, non tangible, ou non conforme à l'éthique (ex: achat de tabac) augmente le risque.
    - Notez ce score et justifiez-le par rapport à l'objet.

4.  **Score de Risque (sur 100)**:
    - Calculez une moyenne pondérée des scores précédents pour obtenir un score de risque global. Donnez plus de poids au Score d'Activité et Comportemental.
    - Un score de risque bas est bon, un score élevé est mauvais.
    - Notez ce score et expliquez comment il a été obtenu.

**Règles de Décision basées sur le Score de Risque:**

- **approbation automatique (approved)** : Score de risque < 40. Montants raisonnables (< 300 000 F) avec un bon historique et un objet clair.
- **rejet automatique (rejected)** : Score de risque > 70. Nouveaux utilisateurs sans historique, montants excessifs, ou objet non conforme.
- **examen par comité (review)** : Score de risque entre 40 et 70. Cas limites (ex: montant élevé mais bon historique).

**Output Requis :**

1.  **Scores**: Remplissez l'objet 'scores' avec les 4 scores calculés (valeur et explication).
2.  **Statut** : 'approved', 'rejected', ou 'review' basé sur le score de risque.
3.  **Raison (Justification)** : Fournissez une raison claire, concise et structurée qui servira de base pour le Procès-Verbal (PV) de la décision. Commencez par la conclusion, puis listez les points clés de l'analyse des scores.
4.  **Plan de Remboursement** : Si le statut est 'approved', calculez le plan de remboursement avec un taux de profit annuel de 23.5%.

**Informations sur le demandeur :**
Alias: ${input.alias}
Montant du financement demandé : ${input.amount} F
Type de financement: ${input.financingType}
Durée : ${input.durationMonths} mois
Objet du financement: ${input.purpose}
Solde actuel : ${input.currentBalance} F

**Répondez uniquement avec un objet JSON valide conforme au schéma.**
`;

    const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: IslamicFinancingOutputSchema,
        },
    });

    const text = result.response.text();
    const parsed = JSON.parse(text);

    return IslamicFinancingOutputSchema.parse(parsed);
}
