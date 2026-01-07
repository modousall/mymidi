

"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { billPaymentAssistant } from '@/ai/flows/bill-payment-assistant';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useTransactions } from '@/hooks/use-transactions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useProductManagement } from '@/hooks/use-product-management';
import { formatCurrency } from '@/lib/utils';
import type { BillPaymentAssistantOutput } from '@/lib/types';


const paymentFormSchema = z.object({
  biller: z.string().min(1, { message: "Le facturier est requis." }),
  identifier: z.string().min(1, { message: "L'identifiant est requis." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

type BillPaymentFormProps = {
    onBack: () => void;
}

export default function BillPaymentForm({ onBack }: BillPaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<BillPaymentAssistantOutput | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentFormValues | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { addTransaction } = useTransactions();
  const { billers } = useProductManagement();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      biller: "",
      identifier: "",
      amount: '' as any,
    },
  });

  async function onSubmit(values: PaymentFormValues) {
    setIsLoading(true);
    setPaymentDetails(values);
    try {
      const result = await billPaymentAssistant({
        service: values.biller,
        identifier: values.identifier,
        amount: values.amount,
      });
      setAnalysis(result);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("L'analyse de paiement de facture par l'IA a échoué:", error);
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
            counterparty: `${paymentDetails.biller}`,
            reason: `Facture ${paymentDetails.biller} - ${paymentDetails.identifier}`,
            date: new Date().toISOString(),
            amount: paymentDetails.amount,
            status: "Terminé",
        });
        toast({
            title: "Paiement de facture effectué !",
            description: `Votre facture ${paymentDetails.biller} de ${formatCurrency(paymentDetails.amount)} a été réglée.`,
        });
      }

      form.reset();
      setAnalysis(null);
      setPaymentDetails(null);
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <Button onClick={onBack} variant="ghost" size="icon">
            <ArrowLeft />
        </Button>
        <h2 className="text-2xl font-bold text-primary">Payer une facture</h2>
      </div>

      <p className="text-muted-foreground mb-6">Sélectionnez le facturier et saisissez les détails de votre facture.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="biller"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Facturier</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le service à payer" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {billers.map(b => (
                            <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
           />

          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>N° de contrat / police / téléphone</FormLabel>
                <FormControl>
                    <Input placeholder={`Entrez votre identifiant`} {...field} />
                </FormControl>
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
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Vérifier le paiement
          </Button>
        </form>
      </Form>
      
      {analysis && paymentDetails && (
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer le paiement de la facture</AlertDialogTitle>
                    <AlertDialogDescription>Veuillez examiner les détails avant de confirmer.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="text-sm space-y-4 py-4 border-y">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium">{paymentDetails.biller}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Identifiant:</span>
                        <span className="font-medium">{paymentDetails.identifier}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Montant:</span>
                        <span className="font-medium text-lg text-primary">{formatCurrency(paymentDetails.amount)}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                        {analysis.isValid ? (
                            <Badge variant="default" className="bg-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))]">Infos Valides</Badge>
                        ) : (
                            <Badge variant="destructive">Infos à vérifier</Badge>
                        )}
                        Conseils de l'assistant IA
                    </h4>
                    <ul className="list-disc list-inside bg-secondary p-3 rounded-md text-secondary-foreground space-y-1 text-xs">
                        {analysis.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePaymentConfirm} className="bg-accent text-accent-foreground hover:bg-accent/90">
                        Confirmer et Payer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
