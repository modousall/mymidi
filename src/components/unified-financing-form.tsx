
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Info, CheckCircle, XCircle, Hourglass, CalendarIcon, Banknote, QrCode, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import QRCodeScanner from './qr-code-scanner';
import { useBnpl } from '@/hooks/use-bnpl';
import { useIslamicFinancing } from '@/hooks/use-islamic-financing';
import type { BnplAssessmentOutput, IslamicFinancingOutput } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from './ui/card';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { useUserManagement } from '@/hooks/use-user-management';
import QrCodeDisplay from './qr-code-display';
import { AliasSelector } from './alias-selector';


// --- Zod Schemas ---
const financingTypeSchema = z.enum(['bnpl', 'mourabaha', 'ijara', 'moudaraba']);

const baseSchema = z.object({
  financingType: financingTypeSchema,
  clientAlias: z.string().optional(),
});

const bnplSchema = baseSchema.extend({
  financingType: z.literal('bnpl'),
  merchantAlias: z.string().min(1, "L'alias du marchand est requis."),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  downPayment: z.coerce.number().min(0).optional(),
  repaymentFrequency: z.enum(['daily', 'weekly', 'monthly']),
  installmentsCount: z.coerce.number().int().positive(),
  firstInstallmentDate: z.date(),
});

const islamicFinancingSchema = baseSchema.extend({
  financingType: z.enum(['mourabaha', 'ijara', 'moudaraba']),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  durationMonths: z.coerce.number().int().min(1).max(36),
  purpose: z.string().min(10, "Veuillez décrire l'objet.").max(200),
});

const unifiedSchema = z.discriminatedUnion("financingType", [bnplSchema, islamicFinancingSchema]);

type UnifiedFormValues = z.infer<typeof unifiedSchema>;
type FinancingType = UnifiedFormValues['financingType'];

// --- Props ---
export type CreditProposalPrefill = Omit<Extract<UnifiedFormValues, { financingType: 'bnpl' }>, 'firstInstallmentDate' | 'financingType' | 'clientAlias'> & {
    firstInstallmentDate: string;
    clientAlias?: string;
};

type UnifiedFinancingFormProps = {
  onBack: () => void;
  prefillData?: CreditProposalPrefill | null;
  isAdminMode?: boolean;
};

// --- Constants & Helpers ---
const ANNUAL_RATE = 23.5;
const getMarginRate = (frequency: 'daily' | 'weekly' | 'monthly') => {
  switch (frequency) {
    case 'daily': return ANNUAL_RATE / 365;
    case 'weekly': return ANNUAL_RATE / 52;
    case 'monthly': return ANNUAL_RATE / 12;
    default: return 0;
  }
};

const financingTypeLabels: Record<FinancingType, string> = {
  bnpl: 'Crédit Achat (BNPL)',
  mourabaha: 'Mourabaha (Achat de biens)',
  ijara: 'Ijara (Location)',
  moudaraba: 'Moudaraba (Partenariat)',
};

// --- Result Display Component ---
const ResultDisplay = ({ result, onBack, submittedAmount }: { result: BnplAssessmentOutput | IslamicFinancingOutput, onBack: () => void, submittedAmount: number }) => {
    const statusConfig = {
        approved: { icon: <CheckCircle className="h-12 w-12 text-green-500" />, title: "Demande Approuvée !", alertVariant: "default" as "default", desc: "Votre demande a été approuvée." },
        rejected: { icon: <XCircle className="h-12 w-12 text-destructive" />, title: "Demande Rejetée", alertVariant: "destructive" as "destructive", desc: "Nous ne pouvons pas approuver votre demande pour le moment." },
        review: { icon: <Hourglass className="h-12 w-12 text-blue-500" />, title: "Demande en Cours d'Examen", alertVariant: "default" as "default", desc: "Votre demande nécessite un examen manuel." }
    };
    const config = statusConfig[result.status];

    return (
        <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
            {config.icon}
            <h2 className="text-2xl font-bold">{config.title}</h2>
            
            <div className="p-4 bg-secondary rounded-lg w-full">
                <p className="text-sm text-muted-foreground">Montant de votre demande</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(submittedAmount)}</p>
            </div>

            <Alert variant={config.alertVariant}>
                <AlertTitle className="font-semibold">Raison: {result.reason}</AlertTitle>
                <AlertDescription>{config.desc}</AlertDescription>
            </Alert>
            {result.status === 'approved' && result.repaymentPlan && (
                <div className="w-full p-4 border rounded-lg bg-secondary">
                    <h3 className="font-semibold mb-2">Plan de remboursement</h3>
                    <p className="text-sm">{result.repaymentPlan}</p>
                </div>
            )}
            <Button onClick={onBack} variant="outline">Retour</Button>
        </div>
    );
}

// --- Confirmation Dialog Component ---
const ConfirmationDialogContent = ({ values, onConfirm, onCancel }: { values: any | null, onConfirm: () => void, onCancel: () => void }) => {
    if (!values) return null;

    const schedule = useMemo(() => {
        if (!values || !values.schedule) return [];
        return values.schedule;
    }, [values]);


    return (
        <>
            <DialogHeader>
                <DialogTitle>Confirmer la demande de crédit</DialogTitle>
                 <DialogDescription>
                    Veuillez vérifier les détails de votre demande avant de la soumettre pour évaluation.
                 </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm border-t border-b">
                 <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Marchand</span><span className="font-medium">{values.merchantAlias}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Coût du crédit</span><span className="font-medium">{formatCurrency(values.totalCost || 0)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Montant de l'achat</span><span className="font-medium">{formatCurrency(values.amount || 0)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Taux périodique</span><span className="font-medium">{values.marginRate.toFixed(4)}%</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Avance versée</span><span className="font-medium">{formatCurrency(values.downPayment || 0)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">TEG Annuel</span><span className="font-medium">{ANNUAL_RATE.toFixed(2)}%</span></div>
                 </div>
                 <hr/>
                 <div className="grid grid-cols-2 gap-x-8 gap-y-2 font-semibold">
                    <div className="flex justify-between items-center"><span>Montant à financer</span><span className="text-primary">{formatCurrency(values.financedAmount || 0)}</span></div>
                    <div className="flex justify-between items-center"><span>Nb. d'échéances</span><span className="text-primary">{values.installmentsCount}</span></div>
                    <div className="flex justify-between items-center col-span-2 text-lg"><span>Montant par échéance</span><span className="font-bold text-primary">{formatCurrency(values.installmentAmount || 0)}</span></div>
                 </div>
                 <hr/>
                 <div>
                    <h4 className="font-medium mb-2">Échéancier Prévisionnel</h4>
                    <ScrollArea className="h-40 border rounded-md">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary">
                                <TableRow>
                                    <TableHead className="w-[50px]">N°</TableHead><TableHead>Date</TableHead>
                                    <TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Intérêts</TableHead>
                                    <TableHead className="text-right">Solde Restant</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {schedule.map((row: any) => (
                                    <TableRow key={row.number}>
                                        <TableCell>{row.number}</TableCell><TableCell>{row.date}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(row.principal)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(row.interest)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(row.balance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                 </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Annuler</Button>
                <Button onClick={onConfirm}>Confirmer et Soumettre</Button>
            </DialogFooter>
        </>
    )
}

// --- Main Form Component ---
export default function UnifiedFinancingForm({ onBack, prefillData = null, isAdminMode = false }: UnifiedFinancingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<BnplAssessmentOutput | IslamicFinancingOutput | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formValuesForConfirmation, setFormValuesForConfirmation] = useState<any>(null);
  const { toast } = useToast();
  const bnpl = useBnpl();
  const islamicFinancing = useIslamicFinancing();
  const { users } = useUserManagement();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const lastAlias = localStorage.getItem('midi_last_alias');
    if (lastAlias) {
      const user = users.find(u => u.alias === lastAlias);
      setCurrentUser(user);
    }
  }, [users]);

  const form = useForm<UnifiedFormValues>({
    resolver: zodResolver(unifiedSchema),
    defaultValues: prefillData ? { 
        financingType: 'bnpl', 
        ...prefillData, 
        firstInstallmentDate: new Date(prefillData.firstInstallmentDate),
        clientAlias: prefillData.clientAlias || '',
        downPayment: prefillData.downPayment || undefined,
    } : {
        financingType: 'bnpl',
        merchantAlias: '',
        amount: '' as any,
        downPayment: undefined,
        repaymentFrequency: "weekly",
        installmentsCount: 17,
        firstInstallmentDate: undefined,
        clientAlias: '',
    },
  });
  
  const watchedType = form.watch('financingType');

  // Dynamic calculation for BNPL
  const watchedBnplValues = form.watch(['amount', 'downPayment', 'installmentsCount', 'repaymentFrequency', 'firstInstallmentDate']);
  const marginRate = getMarginRate(watchedBnplValues[3] as 'daily'|'weekly'|'monthly');

  const calculatedBnplValues = useMemo(() => {
    const [amount, downPayment, installmentsCount, frequency, firstInstallmentDate] = watchedBnplValues;
    if (watchedType === 'bnpl' && amount > 0 && installmentsCount > 0 && marginRate >= 0 && firstInstallmentDate) {
        const financedAmount = amount - (downPayment || 0);
        const periodicRate = marginRate / 100;
        const installmentAmount = periodicRate > 0 
            ? (financedAmount * periodicRate) / (1 - Math.pow(1 + periodicRate, -installmentsCount))
            : financedAmount / installmentsCount;
        const totalRepaid = installmentAmount * installmentsCount;
        const totalCost = totalRepaid - financedAmount;

        const schedule = [];
        let remainingBalance = financedAmount;
        let installmentDate = firstInstallmentDate;

        for (let i = 1; i <= installmentsCount; i++) {
            const interestComponent = remainingBalance * periodicRate;
            const principalComponent = installmentAmount - interestComponent;
            remainingBalance -= principalComponent;
            schedule.push({
                number: i, date: format(installmentDate, 'dd/MM/yyyy'), payment: installmentAmount,
                principal: principalComponent, interest: interestComponent, balance: Math.max(0, remainingBalance)
            });
            if (frequency === 'daily') installmentDate = addDays(installmentDate, 1);
            if (frequency === 'weekly') installmentDate = addWeeks(installmentDate, 1);
            if (frequency === 'monthly') installmentDate = addMonths(installmentDate, 1);
        }

        return { financedAmount, installmentAmount: isNaN(installmentAmount) ? 0 : Math.ceil(installmentAmount), totalCost: isNaN(totalCost) ? 0 : totalCost, schedule };
    }
    return { financedAmount: 0, installmentAmount: 0, totalCost: 0, schedule: []};
  }, [watchedType, watchedBnplValues, marginRate]);


  useEffect(() => {
    if (prefillData) {
        form.reset({
            financingType: 'bnpl',
            ...prefillData,
            firstInstallmentDate: new Date(prefillData.firstInstallmentDate),
            clientAlias: prefillData.clientAlias || ''
        });
        toast({ title: "Proposition de crédit chargée", description: "Vérifiez et soumettez la demande." });
    }
  }, [prefillData, form]);

   useEffect(() => {
    // When financingType changes, reset clientAlias if not in admin mode
    if (!isAdminMode) {
      form.setValue('clientAlias', '');
    }
  }, [watchedType, isAdminMode, form]);

  const onSubmit = async (values: UnifiedFormValues) => {
    if (values.financingType === 'bnpl') {
        setFormValuesForConfirmation({ ...values, ...calculatedBnplValues, marginRate });
        setShowConfirmation(true);
    } else {
        // For Islamic financing, submit directly
        setIsLoading(true);
        try {
            const result = await islamicFinancing.submitRequest({
                financingType: values.financingType,
                amount: values.amount,
                durationMonths: values.durationMonths,
                purpose: values.purpose,
            }, values.clientAlias);
            setAssessmentResult(result);
        } catch(e) {
            console.error(e);
            toast({ title: "Erreur de soumission", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
  };

  const onConfirmBnplSubmit = async () => {
    if (!formValuesForConfirmation) return;
    setShowConfirmation(false);
    setIsLoading(true);
    try {
        const result = await bnpl.submitRequest({
            merchantAlias: formValuesForConfirmation.merchantAlias,
            amount: formValuesForConfirmation.amount,
            downPayment: formValuesForConfirmation.downPayment,
            installmentsCount: formValuesForConfirmation.installmentsCount,
            marginRate: marginRate,
            repaymentFrequency: formValuesForConfirmation.repaymentFrequency,
            firstInstallmentDate: formValuesForConfirmation.firstInstallmentDate.toISOString(),
        }, formValuesForConfirmation.clientAlias);
        setAssessmentResult(result);
    } catch(e) {
        console.error(e);
        toast({ title: "Erreur de soumission", variant: "destructive" });
    } finally {
        setIsLoading(false);
        setFormValuesForConfirmation(null);
    }
  }
  
  const handleScannedCode = (decodedText: string) => {
    form.setValue('merchantAlias', decodedText, { shouldValidate: true });
    setIsScannerOpen(false);
  }
  
  const handleResetAndBack = () => {
      setAssessmentResult(null);
      form.reset();
      onBack();
  }

  if(assessmentResult) {
    const submittedAmount = (form.getValues('financingType') === 'bnpl' ? form.getValues('amount') : form.getValues('amount')) || 0;
    return <ResultDisplay result={assessmentResult} onBack={handleResetAndBack} submittedAmount={submittedAmount} />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isAdminMode && (
             <FormField
                control={form.control}
                name="clientAlias"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Alias du Client</FormLabel>
                        <FormControl>
                            <AliasSelector value={field.value ?? ''} onChange={field.onChange} filter="user" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <FormField
          control={form.control}
          name="financingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de Financement</FormLabel>
              <Select onValueChange={(value) => field.onChange(value as FinancingType)} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez un type..." /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(financingTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {watchedType === 'bnpl' && (
            <>
                <FormField control={form.control} name="merchantAlias" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Alias ou Code Marchand</FormLabel>
                        <div className="flex gap-2">
                            <AliasSelector
                                value={field.value}
                                onChange={field.onChange}
                                disabled={!!prefillData}
                                filter="merchant"
                            />
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" aria-label="QR Code" disabled={!!prefillData}>
                                        <QrCode />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xs p-4">
                                    <DialogHeader className="mb-4">
                                        <DialogTitle className="text-center">Mon Code Midi</DialogTitle>
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
                )}/>
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Montant total de l'achat</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly={!!prefillData} className={prefillData ? 'bg-muted' : ''}/></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="downPayment" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Avance (optionnel)</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly={!!prefillData} className={prefillData ? 'bg-muted' : ''}/></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="installmentsCount" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre d'échéances</FormLabel>
                            <FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly={!!prefillData} className={prefillData ? 'bg-muted' : ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="repaymentFrequency" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Périodicité</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!prefillData}>
                                <FormControl><SelectTrigger className={prefillData ? 'bg-muted' : ''}><SelectValue /></SelectTrigger></FormControl>
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
                                <Button variant={"outline"} disabled={!!prefillData} className={cn(!field.value && "text-muted-foreground", prefillData ? 'bg-muted' : '')}>
                                {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisissez une date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()}/>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}/>
                {calculatedBnplValues.installmentAmount > 0 && (
                    <Card className="bg-secondary/50">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Montant par échéance (estimation)</p>
                                <p className="text-lg font-bold text-primary">{formatCurrency(calculatedBnplValues.installmentAmount)}</p>
                            </div>
                            <Banknote className="h-8 w-8 text-primary/70" />
                        </CardContent>
                    </Card>
                )}
            </>
        )}

        { (watchedType === 'mourabaha' || watchedType === 'ijara' || watchedType === 'moudaraba') && (
            <>
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Montant du financement (Fcfa)</FormLabel>
                        <FormControl><Input type="number" placeholder="ex: 250000" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="durationMonths" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Durée de remboursement (en mois)</FormLabel>
                        <FormControl><Input type="number" placeholder="ex: 12" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="purpose" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Objet du financement</FormLabel>
                        <FormControl><Textarea placeholder="ex: Achat d'un ordinateur portable" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
            </>
        )}

        <Button type="submit" className="w-full py-6" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Soumettre la Demande
        </Button>

        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
            <DialogContent className="max-w-xl">
                 <ConfirmationDialogContent
                    values={formValuesForConfirmation}
                    onConfirm={onConfirmBnplSubmit}
                    onCancel={() => setShowConfirmation(false)}
                />
            </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}
