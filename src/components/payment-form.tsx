
"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { paymentSecurityAssistant } from '@/ai/flows/payment-security-assistant';
import type { PaymentSecurityAssistantOutput } from '@/ai/flows/payment-security-assistant';
import SecurityAssistantDialog from './security-assistant-dialog';
import { Loader2, ClipboardPaste, QrCode, ScanLine } from 'lucide-react';
import { useTransactions } from '@/hooks/use-transactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import UnifiedFinancingForm from './unified-financing-form';
import { formatCurrency } from '@/lib/utils';
import type { CreditProposalPrefill } from './unified-financing-form';
import { useUserManagement } from '@/hooks/use-user-management';
import QrCodeDisplay from './qr-code-display';
import { AliasSelector } from './alias-selector';
import dynamic from 'next/dynamic';
import { Skeleton } from './ui/skeleton';

const QRCodeScanner = dynamic(() => import('./qr-code-scanner'), {
  loading: () => <div className="flex items-center justify-center h-48"><Skeleton className="h-32 w-32" /></div>,
  ssr: false,
});


export const creditProposalSchema = z.object({
  type: z.literal('bnpl_proposal'),
  merchantAlias: z.string(),
  clientAlias: z.string(),
  amount: z.number(),
  downPayment: z.number().optional(),
  repaymentFrequency: z.string(),
  installmentsCount: z.number(),
  firstInstallmentDate: z.string(),
  marginRate: z.number(),
});
export type CreditProposal = z.infer<typeof creditProposalSchema>;

const paymentFormSchema = z.object({
  recipientAlias: z.string().min(1, { message: "L'alias du destinataire est requis." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
  reason: z.string().max(140).optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function PaymentForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [securityAnalysis, setSecurityAnalysis] = useState<PaymentSecurityAssistantOutput | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentFormValues | null>(null);
  const [creditProposal, setCreditProposal] = useState<CreditProposalPrefill | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { toast } = useToast();
  const { addTransaction } = useTransactions();
  const { users } = useUserManagement();
  const [currentUser, setCurrentUser] = useState<any>(null);

  React.useEffect(() => {
    const lastAlias = localStorage.getItem('midi_last_alias');
    if (lastAlias) {
      const user = users.find(u => u.alias === lastAlias);
      setCurrentUser(user);
    }
  }, [users]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      recipientAlias: "",
      amount: '' as any,
      reason: "",
    },
  });
  
  if (creditProposal) {
    return <UnifiedFinancingForm onBack={() => setCreditProposal(null)} prefillData={creditProposal} />;
  }

  async function onSubmit(values: PaymentFormValues) {
    setIsLoading(true);
    setPaymentDetails(values);
    try {
      const result = await paymentSecurityAssistant({
        recipientAlias: values.recipientAlias,
        recipientAccountDetails: 'N/A pour le paiement par alias',
        amount: values.amount,
        transactionType: 'Paiement par alias',
      });
      setSecurityAnalysis(result);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("L'analyse de sécurité par l'IA a échoué:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer la vérification de sécurité. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handlePaymentConfirm = () => {
      setIsDialogOpen(false);

      if (paymentDetails) {
        addTransaction({
            type: "sent",
            counterparty: paymentDetails.recipientAlias,
            reason: paymentDetails.reason || "Paiement",
            date: new Date().toISOString(),
            amount: paymentDetails.amount,
            status: "Terminé",
        });
        toast({
            title: "Paiement Envoyé!",
            description: `Envoyé avec succès ${formatCurrency(paymentDetails.amount)} à ${paymentDetails.recipientAlias}.`,
        });
      }

      form.reset();
      setSecurityAnalysis(null);
      setPaymentDetails(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      form.setValue('recipientAlias', text, { shouldValidate: true });
      toast({ title: "Collé !", description: "L'alias a été collé depuis le presse-papiers." });
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de lire le presse-papiers.", variant: "destructive" });
    }
  };

  const handleScannedCode = (decodedText: string) => {
    try {
        const data = JSON.parse(decodedText);
        const proposalResult = creditProposalSchema.safeParse(data);
        if (proposalResult.success) {
            const { type, clientAlias, ...proposal } = proposalResult.data;
            setCreditProposal(proposal);
            setIsScannerOpen(false);
            return;
        }

        if (data.shid) {
            form.setValue('recipientAlias', data.shid, { shouldValidate: true });
            if (data.amount) {
                form.setValue('amount', data.amount, { shouldValidate: true });
            }
            if (data.reason) {
                form.setValue('reason', data.reason, { shouldValidate: true });
            }
            toast({ title: "Code marchand scanné !", description: "Les détails du paiement ont été pré-remplis." });
        } else {
            form.setValue('recipientAlias', decodedText, { shouldValidate: true });
            toast({ title: "Code scanné", description: "Le code a été inséré." });
        }
    } catch(e) {
        form.setValue('recipientAlias', decodedText, { shouldValidate: true });
        toast({ title: "Code scanné", description: "Le code a été inséré." });
    }
    setIsScannerOpen(false);
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="recipientAlias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alias ou N° du destinataire</FormLabel>
                <div className="flex gap-2">
                    <AliasSelector 
                        value={field.value}
                        onChange={field.onChange}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handlePaste} aria-label="Coller">
                      <ClipboardPaste />
                    </Button>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="icon" aria-label="QR Code">
                                <QrCode />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xs p-4">
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-center">Mon Code QR de Paiement</DialogTitle>
                            </DialogHeader>
                            {currentUser && (
                                <QrCodeDisplay alias={currentUser.alias} userInfo={currentUser} simpleMode={true} />
                            )}
                             <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" className="w-full mt-4"><ScanLine className="mr-2"/>Scanner un code</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md p-0">
                                    <DialogHeader className="p-4"><DialogTitle>Scanner un code QR</DialogTitle></DialogHeader>
                                    <QRCodeScanner onScan={handleScannedCode}/>
                                </DialogContent>
                            </Dialog>
                        </DialogContent>
                    </Dialog>
                  </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="5000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Raison (Optionnel)</FormLabel>
                <FormControl>
                  <Textarea placeholder="ex: Argent pour le déjeuner (max 140 caractères)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Vérifier le paiement
          </Button>
        </form>
      </Form>
      
      {securityAnalysis && paymentDetails && (
        <SecurityAssistantDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            analysis={securityAnalysis}
            onConfirm={handlePaymentConfirm}
            paymentDetails={paymentDetails}
        />
      )}
    </>
  );
}
