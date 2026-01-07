
import { z } from 'zod';

// --- Reusable Schemas ---
const ScoreDetailSchema = z.object({
  value: z.number().describe('La valeur numérique du score, généralement sur 100.'),
  explanation: z.string().describe('Une brève explication sur la manière dont le score a été calculé.'),
});

// --- Entity Schemas ---

export type Transaction = {
  id: string;
  type: "sent" | "received" | "tontine" | "card_recharge" | "versement";
  counterparty: string;
  reason: string;
  date: string; // ISO string
  amount: number;
  status: "Terminé" | "En attente" | "Échoué" | "Retourné";
  accountId: string;
};

export type ManagedUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  alias: string; // phone number for login
  phoneNumber: string;
  merchantCode?: string; // public merchant code
  balance: number;
  avatar: string | null;
  isSuspended: boolean;
  role: string;
};

export type Vault = {
  id: string;
  name: string;
  balance: number;
  targetAmount: number | null;
};

export type Tontine = {
  id: string;
  name: string;
  participants: string[]; // array of contact IDs
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  progress: number;
  isMyTurn: boolean;
};

export type CardDetails = {
  number: string;
  expiry: string;
  cvv: string;
  isFrozen: boolean;
  balance: number;
};

export type CardTransaction = {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  merchant: string;
  date: string;
};

export type ManagedUserWithTransactions = ManagedUser & {
    transactions: Transaction[];
}

export type ManagedUserWithDetails = ManagedUserWithTransactions & {
    vaults: Vault[];
    tontines: Tontine[];
    virtualCard: (CardDetails & { transactions: CardTransaction[] }) | null;
}

// --- AI Flow Schemas ---

// Bill Payment Assistant
export const BillPaymentAssistantInputSchema = z.object({
  service: z.string().describe('The name of the service being paid (e.g., SDE, SENELEC).'),
  identifier: z.string().describe('The customer identifier (e.g., contract number, phone number).'),
  amount: z.number().describe('The amount to be paid.'),
});
export type BillPaymentAssistantInput = z.infer<typeof BillPaymentAssistantInputSchema>;

export const BillPaymentAssistantOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the provided information seems valid.'),
  suggestions: z.array(z.string()).describe('A list of suggestions or warnings for the user.'),
});
export type BillPaymentAssistantOutput = z.infer<typeof BillPaymentAssistantOutputSchema>;


// BNPL (Buy Now, Pay Later) Schemas and Types
export const BnplAssessmentInputSchema = z.object({
  alias: z.string().describe('The user alias applying for BNPL.'),
  purchaseAmount: z.number().describe('The total amount of the purchase.'),
  downPayment: z.number().optional().describe('The down payment made by the user, if any.'),
  transactionHistory: z
    .array(
      z.object({
        amount: z.number(),
        type: z.string(),
        date: z.string(),
      })
    )
    .describe("A summary of the user's recent transaction history."),
  currentBalance: z.number().describe('The current main balance of the user.'),
  repaymentFrequency: z.string().describe('The frequency of repayments (e.g., weekly, monthly).'),
  installmentsCount: z.number().describe('The total number of installments.'),
  firstInstallmentDate: z.string().describe('The date of the first installment.'),
  marginRate: z.number().describe('The periodic margin rate for the credit.'),
});
export type BnplAssessmentInput = z.infer<typeof BnplAssessmentInputSchema>;

export const BnplAssessmentOutputSchema = z.object({
  status: z
    .enum(['approved', 'rejected', 'review'])
    .describe(
      'The assessment status of the application. "review" means it requires manual admin approval.'
    ),
  reason: z.string().describe('A brief reason for the decision.'),
  repaymentPlan: z.string().optional().describe('A suggested repayment plan if approved.'),
  scores: z.object({
    socialProfessional: ScoreDetailSchema.describe('Score basé sur des facteurs socio-professionnels.'),
    activity: ScoreDetailSchema.describe("Score basé sur l'activité et l'historique transactionnel."),
    behavioral: ScoreDetailSchema.describe('Score basé sur le comportement financier (ex: remboursements, épargne).'),
    risk: ScoreDetailSchema.describe('Score global de risque calculé à partir des autres scores.'),
  }).optional().describe("Détail du Score-360 pour cette demande."),
});
export type BnplAssessmentOutput = z.infer<typeof BnplAssessmentOutputSchema>;

export type BnplStatus = 'review' | 'approved' | 'rejected';

export type BnplRequest = {
    id: string;
    alias: string;
    merchantAlias: string;
    amount: number;
    status: BnplStatus;
    reason: string;
    repaymentPlan?: string;
    requestDate: string;
    repaidAmount?: number;
    scores?: z.infer<typeof BnplAssessmentOutputSchema>['scores'];
};


// Islamic Financing Schemas and Types
export const IslamicFinancingInputSchema = z.object({
  alias: z.string().describe('The user alias applying for financing.'),
  financingType: z.string().describe('The type of Islamic financing requested (e.g., Mourabaha).'),
  amount: z.number().describe('The amount of financing requested.'),
  durationMonths: z.number().describe('The duration of the financing in months.'),
  purpose: z.string().describe('The purpose of the financing (e.g., buying a car, starting a business).'),
  transactionHistory: z.array(z.object({ amount: z.number(), type: z.string(), date: z.string(), })).describe("A summary of the user's recent transaction history."),
  currentBalance: z.number().describe('The current main balance of the user.'),
});
export type IslamicFinancingInput = z.infer<typeof IslamicFinancingInputSchema>;


export const IslamicFinancingOutputSchema = z.object({
  status: z.enum(['approved', 'rejected', 'review']).describe('The assessment status of the application.'),
  reason: z.string().describe('A brief reason for the decision.'),
  repaymentPlan: z.string().optional().describe('A suggested repayment plan if approved, including monthly installments and total amount.'),
  scores: z.object({
    socialProfessional: ScoreDetailSchema.describe('Score basé sur des facteurs socio-professionnels.'),
    activity: ScoreDetailSchema.describe("Score basé sur l'activité et l'historique transactionnel."),
    behavioral: ScoreDetailSchema.describe('Score basé sur le comportement financier (ex: remboursements, épargne).'),
    risk: ScoreDetailSchema.describe('Score global de risque calculé à partir des autres scores.'),
  }).optional().describe("Détail du Score-360 pour cette demande de financement."),
});
export type IslamicFinancingOutput = z.infer<typeof IslamicFinancingOutputSchema>;

export type FinancingStatus = 'review' | 'approved' | 'rejected';

export type FinancingRequest = {
    id: string;
    alias: string;
    financingType: string;
    amount: number;
    durationMonths: number;
    purpose: string;
    status: FinancingStatus;
    reason: string;
    repaymentPlan?: string;
    requestDate: string;
    scores?: z.infer<typeof IslamicFinancingOutputSchema>['scores'];
};
