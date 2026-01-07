
'use server';
/**
 * @fileOverview An AI flow for assessing BNPL (Buy Now, Pay Later) applications.
 *
 * - assessBnplApplication - A function that handles the BNPL assessment process.
 */

import { openaiGenerate } from '@/ai/openai';
import { BnplAssessmentInputSchema, BnplAssessmentOutputSchema, type BnplAssessmentInput, type BnplAssessmentOutput } from '@/lib/types';


export async function assessBnplApplication(
  input: BnplAssessmentInput
): Promise<BnplAssessmentOutput> {
  const prompt = `Vous êtes un expert en évaluation de crédit pour un service financier en Afrique de l'Ouest, agissant comme un moteur de décision automatisé.
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

**Règles de Décision :**
-  Le statut de la demande doit TOUJOURS être 'review'. Un administrateur prendra la décision finale.

**Output Requis :**

Vous devez répondre uniquement avec un objet JSON valide qui respecte la structure suivante (ne renvoyez aucun texte ou formatage supplémentaire) :
{
  "status": "'review'",
  "reason": "Une justification claire et concise pour la décision.",
  "repaymentPlan": "Un plan de remboursement si la demande est approuvée, sinon une chaîne vide.",
  "scores": {
    "socialProfessional": { "value": 0, "explanation": "..." },
    "activity": { "value": 0, "explanation": "..." },
    "behavioral": { "value": 0, "explanation": "..." },
    "risk": { "value": 0, "explanation": "..." }
  }
}

**Informations sur le demandeur :**
Alias: ${input.alias}
Montant de l'achat : ${input.purchaseAmount} Fcfa
Avance versée : ${input.downPayment ? `${input.downPayment} Fcfa` : '0 Fcfa'}
Solde actuel : ${input.currentBalance} Fcfa
Nombre d'échéances: ${input.installmentsCount}
Périodicité de remboursement: ${input.repaymentFrequency}
Date de première échéance: ${input.firstInstallmentDate}
Taux de marge: ${input.marginRate}% par période
`;

  const result = await openaiGenerate(prompt);
  return BnplAssessmentOutputSchema.parse(JSON.parse(result));
}
