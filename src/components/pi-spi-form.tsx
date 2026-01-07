
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe } from 'lucide-react';
import { useTransactions } from '@/hooks/use-transactions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AliasSelector } from './alias-selector';
import { formatCurrency } from '@/lib/utils';
import { useBalance } from '@/hooks/use-balance';

const aliasTransferSchema = z.object({
  recipientAlias: z.string().min(1, { message: "L'alias du destinataire est requis." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
  reason: z.string().max(140).optional(),
});

const ibanTransferSchema = z.object({
  iban: z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/, "Format d'IBAN invalide."),
  recipientName: z.string().min(1, "Le nom du bénéficiaire est requis."),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
  reason: z.string().max(140).optional(),
});

type AliasFormValues = z.infer<typeof aliasTransferSchema>;
type IbanFormValues = z.infer<typeof ibanTransferSchema>;

type PiSpiFormProps = {
    onBack: () => void;
};

export default function PiSpiForm({ onBack }: PiSpiFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addTransaction } = useTransactions();
  const { balance, debit } = useBalance();

  const aliasForm = useForm<AliasFormValues>({
    resolver: zodResolver(aliasTransferSchema),
    defaultValues: { recipientAlias: "", amount: '' as any, reason: "" },
  });

  const ibanForm = useForm<IbanFormValues>({
    resolver: zodResolver(ibanTransferSchema),
    defaultValues: { iban: "", recipientName: "", amount: '' as any, reason: "" },
  });

  const handleTransfer = (values: AliasFormValues | IbanFormValues, type: 'alias' | 'iban') => {
    if (values.amount > balance) {
        toast({ title: "Solde insuffisant", variant: "destructive"});
        return;
    }
    
    setIsLoading(true);

    setTimeout(() => {
      debit(values.amount);
      const counterparty = type === 'iban' ? (values as IbanFormValues).recipientName : (values as AliasFormValues).recipientAlias;
      const id = type === 'iban' ? (values as IbanFormValues).iban : (values as AliasFormValues).recipientAlias;
      
      addTransaction({
          type: "sent",
          counterparty,
          reason: `Virement PI-SPI vers ${id} (${values.reason || 'sans motif'})`,
          date: new Date().toISOString(),
          amount: values.amount,
          status: "En attente",
      });

      toast({
          title: "Virement Initié",
          description: `Votre virement de ${formatCurrency(values.amount)} vers ${counterparty} est en cours de traitement.`,
      });

      setIsLoading(false);
      aliasForm.reset();
      ibanForm.reset();
      onBack();
    }, 1500);
  }

  return (
    <div>
        <div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-primary">Transfert PI-SPI</h2>
        </div>
        <p className="text-muted-foreground mb-6">
            Envoyez de l'argent vers une autre institution financière (banque, wallet, etc.) via le réseau interopérable.
        </p>
        <Tabs defaultValue="alias" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="alias">Via Alias/N°</TabsTrigger>
                <TabsTrigger value="iban">Via IBAN</TabsTrigger>
            </TabsList>
            <TabsContent value="alias" className="mt-6">
                <Form {...aliasForm}>
                    <form onSubmit={aliasForm.handleSubmit(v => handleTransfer(v, 'alias'))} className="space-y-6">
                        <FormField control={aliasForm.control} name="recipientAlias" render={({ field }) => (
                            <FormItem><FormLabel>Alias, e-mail ou N° du destinataire</FormLabel><FormControl><AliasSelector value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={aliasForm.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Montant</FormLabel><FormControl><Input type="number" placeholder="5000" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={aliasForm.control} name="reason" render={({ field }) => (
                            <FormItem><FormLabel>Raison (Optionnel)</FormLabel><FormControl><Textarea placeholder="ex: Participation" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2"/>} Effectuer le virement
                        </Button>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="iban" className="mt-6">
                 <Form {...ibanForm}>
                    <form onSubmit={ibanForm.handleSubmit(v => handleTransfer(v, 'iban'))} className="space-y-6">
                        <FormField control={ibanForm.control} name="iban" render={({ field }) => (
                            <FormItem><FormLabel>IBAN du bénéficiaire</FormLabel><FormControl><Input placeholder="SN08..." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={ibanForm.control} name="recipientName" render={({ field }) => (
                            <FormItem><FormLabel>Nom complet du bénéficiaire</FormLabel><FormControl><Input placeholder="ex: Awa Diallo" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={ibanForm.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Montant</FormLabel><FormControl><Input type="number" placeholder="5000" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={ibanForm.control} name="reason" render={({ field }) => (
                            <FormItem><FormLabel>Raison (Optionnel)</FormLabel><FormControl><Textarea placeholder="ex: Remboursement prêt" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2"/>} Effectuer le virement
                        </Button>
                    </form>
                </Form>
            </TabsContent>
        </Tabs>
    </div>
  );
}
