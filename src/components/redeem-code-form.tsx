
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/hooks/use-transactions';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { Transaction } from '@/hooks/use-transactions';


const redeemSchema = z.object({
  code: z.string().min(6, { message: "Le code doit comporter 6 chiffres." }).max(6, { message: "Le code doit comporter 6 chiffres." }),
});

type RedeemFormValues = z.infer<typeof redeemSchema>;

type RedeemCodeFormProps = {
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'accountId'>) => void;
};

export default function RedeemCodeForm({ addTransaction }: RedeemCodeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [transactionToFinalize, setTransactionToFinalize] = useState<Transaction | null>(null);
  const { toast } = useToast();
  const { findPendingTransactionByCode, updateTransactionStatus } = useTransactions();

  const form = useForm<RedeemFormValues>({
    resolver: zodResolver(redeemSchema),
    defaultValues: {
      code: "",
    },
  });

  function onVerify(values: RedeemFormValues) {
    setIsLoading(true);
    setTimeout(() => {
        const transaction = findPendingTransactionByCode(values.code);
        if (transaction) {
            setTransactionToFinalize(transaction);
        } else {
            toast({
                title: "Code Invalide",
                description: "Aucune transaction en attente n'a été trouvée pour ce code.",
                variant: "destructive",
            });
        }
        setIsLoading(false);
    }, 1000);
  }

  const onFinalize = () => {
      if (transactionToFinalize) {
          updateTransactionStatus(transactionToFinalize.id, 'Terminé');

          // The merchant receives the money from the client's debit
          addTransaction({
              type: 'received',
              counterparty: `Client ${transactionToFinalize.accountId.substring(0,6)}`,
              reason: `Validation retrait - Code ${transactionToFinalize.reason.split(': ')[1]}`,
              amount: transactionToFinalize.amount,
              status: 'Terminé',
          });

          toast({
              title: "Retrait Finalisé !",
              description: `L'opération de ${formatCurrency(transactionToFinalize.amount)} a été complétée. Votre compte a été crédité.`
          });
          setTransactionToFinalize(null);
          form.reset();
      }
  }

  if (transactionToFinalize) {
      return (
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirmer le Retrait</DialogTitle>
                <DialogDescription>Veuillez remettre l'argent au client avant de finaliser.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 text-center">
                <p className="text-sm text-muted-foreground">Montant à remettre au client</p>
                <p className="text-4xl font-bold text-primary">{formatCurrency(transactionToFinalize.amount)}</p>
                <p className="text-sm text-muted-foreground">Client: {transactionToFinalize.accountId.substring(0,10)}...</p>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setTransactionToFinalize(null)}>Annuler</Button>
                <DialogClose asChild>
                    <Button onClick={onFinalize}>Finaliser et Clôturer</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
      )
  }

  return (
      <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider un code de retrait</DialogTitle>
            <DialogDescription>Saisissez le code à 6 chiffres présenté par le client pour lui remettre son argent.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onVerify)} className="space-y-4 pt-4">
                <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Code de Retrait</FormLabel>
                    <FormControl>
                        <Input placeholder="123456" {...field} maxLength={6} className="text-center tracking-widest text-lg h-12" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="ghost">Annuler</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Vérifier le Code
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
  );
}
