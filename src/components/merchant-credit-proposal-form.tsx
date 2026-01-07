
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { CalendarIcon, Banknote } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import QrCodeDisplay from './qr-code-display';
import { Card, CardContent } from './ui/card';

const proposalFormSchema = z.object({
  clientAlias: z.string().min(1, { message: "L'alias du client est requis." }),
  amount: z.coerce.number().positive({ message: "Le montant de l'achat doit être positif." }),
  downPayment: z.coerce.number().min(0, "L'avance ne peut être négative.").optional(),
  repaymentFrequency: z.enum(['daily', 'weekly', 'monthly'], { required_error: "La périodicité est requise." }),
  installmentsCount: z.coerce.number().int().positive("Le nombre d'échéances est requis."),
  firstInstallmentDate: z.date({ required_error: "La date de première échéance est requise." }),
});

type ProposalFormValues = z.infer<typeof proposalFormSchema>;

type MerchantCreditProposalFormProps = {
  merchantAlias: string;
  merchantInfo: { name: string; email: string };
  onClose: () => void;
};

const ANNUAL_RATE = 23.5;

const getMarginRate = (frequency: 'daily' | 'weekly' | 'monthly') => {
    switch (frequency) {
        case 'daily': return ANNUAL_RATE / 365;
        case 'weekly': return ANNUAL_RATE / 52;
        case 'monthly': return ANNUAL_RATE / 12;
        default: return 0;
    }
}

export default function MerchantCreditProposalForm({ merchantAlias, merchantInfo, onClose }: MerchantCreditProposalFormProps) {
  const [isQrGenerated, setIsQrGenerated] = useState(false);
  const [proposalData, setProposalData] = useState<ProposalFormValues | null>(null);

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      clientAlias: '',
      amount: '' as any,
      downPayment: '' as any,
      repaymentFrequency: 'weekly',
      installmentsCount: 17,
    },
  });

  const watchedFormValues = form.watch();

  const marginRate = getMarginRate(watchedFormValues.repaymentFrequency as 'daily'|'weekly'|'monthly');

  const calculatedValues = useMemo(() => {
    const { amount, downPayment, installmentsCount } = watchedFormValues;
    if (amount > 0 && installmentsCount > 0 && marginRate >= 0) {
        const financedAmount = amount - (downPayment || 0);
        const periodicRate = marginRate / 100;
        const installmentAmount = periodicRate > 0 
            ? (financedAmount * periodicRate) / (1 - Math.pow(1 + periodicRate, -installmentsCount))
            : financedAmount / installmentsCount;
            
        return { installmentAmount: isNaN(installmentAmount) ? 0 : installmentAmount };
    }
    return { installmentAmount: 0 };
  }, [watchedFormValues, marginRate]);

  const onSubmit = (values: ProposalFormValues) => {
    setProposalData(values);
    setIsQrGenerated(true);
  };

  if (isQrGenerated && proposalData) {
    const creditProposal = {
        type: 'bnpl_proposal',
        merchantAlias: merchantAlias,
        clientAlias: proposalData.clientAlias,
        amount: proposalData.amount,
        downPayment: proposalData.downPayment,
        repaymentFrequency: proposalData.repaymentFrequency,
        installmentsCount: proposalData.installmentsCount,
        firstInstallmentDate: proposalData.firstInstallmentDate.toISOString(),
        marginRate: marginRate,
    }
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Proposition de Crédit - {merchantInfo.name}</DialogTitle>
                <DialogDescription>
                    Demandez à votre client de scanner ce QR code avec son application Midi pour valider la demande de crédit.
                </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
                <QrCodeDisplay 
                    alias={merchantAlias}
                    userInfo={merchantInfo}
                    creditProposal={creditProposal}
                    simpleMode={true}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsQrGenerated(false)}>Retour</Button>
                <DialogClose asChild><Button>Fermer</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    )
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Proposer un Paiement Échelonné - {merchantInfo.name}</DialogTitle>
        <DialogDescription>
          Remplissez les détails du crédit. Un QR code sera généré pour que le client puisse valider la demande depuis son téléphone.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="clientAlias" render={({ field }) => (
                <FormItem>
                    <FormLabel>Alias du Client</FormLabel>
                    <FormControl><Input placeholder="Demandez l'alias Midi à votre client" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Montant total de l'achat</FormLabel>
                    <FormControl><Input type="number" placeholder="ex: 150000" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="downPayment" render={({ field }) => (
                <FormItem>
                    <FormLabel>Avance (optionnel)</FormLabel>
                    <FormControl><Input type="number" placeholder="ex: 30000" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
             <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="installmentsCount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre d'échéances</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <FormField control={form.control} name="repaymentFrequency" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Périodicité</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="daily">Journalier</SelectItem>
                                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                                <SelectItem value="monthly">Mensuel</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>
             <FormField control={form.control} name="firstInstallmentDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Date 1ère échéance</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? (format(field.value, "PPP", { locale: fr })) : (<span>Choisissez une date</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange}
                            disabled={(date) => date < new Date() || date > new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}/>

             {calculatedValues.installmentAmount > 0 && (
                <Card className="bg-secondary/50">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Montant par échéance (estimation)</p>
                                <p className="text-lg font-bold text-primary">
                                    {formatCurrency(Math.ceil(calculatedValues.installmentAmount))}
                                </p>
                            </div>
                            <Banknote className="h-8 w-8 text-primary/70" />
                        </div>
                    </CardContent>
                </Card>
            )}

          <DialogFooter className="pt-4">
            <DialogClose asChild>
                <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            </DialogClose>
            <Button type="submit">Générer le QR Code</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
