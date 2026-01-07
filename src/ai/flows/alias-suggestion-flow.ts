
'use server';
/**
 * @fileOverview An AI flow for suggesting user aliases.
 *
 * - aliasSuggestion - A function that suggests aliases based on user info.
 * - AliasSuggestionInput - The input type for the aliasSuggestion function.
 * - AliasSuggestionOutput - The return type for the aliasSuggestion function.
 */
import { z } from 'zod';
import { aiGenerate } from '@/ai/gemini';

const AliasSuggestionInputSchema = z.object({
  name: z.string().optional().describe("The user's full name."),
  email: z.string().optional().describe("The user's email address."),
  existingAliases: z.array(z.string()).describe('A list of aliases that are already taken.'),
});
export type AliasSuggestionInput = z.infer<typeof AliasSuggestionInputSchema>;

const AliasSuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of 3-5 creative and available alias suggestions.'),
});
export type AliasSuggestionOutput = z.infer<typeof AliasSuggestionOutputSchema>;


export async function aliasSuggestion(input: AliasSuggestionInput): Promise<AliasSuggestionOutput> {
  const prompt = `Vous êtes un assistant créatif qui aide les utilisateurs à choisir un alias unique pour un service de paiement en Afrique de l'Ouest.
L'alias doit être facile à retenir, professionnel mais convivial. Inspirez-vous des noms de services existants comme Wave, Orange Money, Free Money, Wari, Wizall, ou Mixx.

Informations sur l'utilisateur:
Nom: ${input.name || 'Non fourni'}
Email: ${input.email || 'Non fourni'}

Alias déjà existants (ne pas les suggérer):
${input.existingAliases.map(alias => `- ${alias}`).join('\n')}

Veuillez générer une liste de 3 à 5 suggestions d'alias uniques et créatives. Les suggestions ne doivent pas être des numéros de téléphone.

La sortie doit être un objet JSON valide avec une seule clé "suggestions" qui est un tableau de chaînes de caractères.
Exemple de sortie:
{
  "suggestions": ["PayTik", "MobiCash", "SenPay"]
}
`;

  const result = await aiGenerate(prompt, true);
  return AliasSuggestionOutputSchema.parse(result);
}
