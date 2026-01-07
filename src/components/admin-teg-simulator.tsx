
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CalendarIcon, AlertTriangle, Download } from 'lucide-react';
import { Separator } from './ui/separator';
import { cn, formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import TegScheduleReceipt from './teg-schedule-receipt';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

const html2canvas = dynamic(() => import('html2canvas'), { ssr: false });
const jsPDF = dynamic(() => import('jspdf').then(mod => mod.jsPDF), { ssr: false });


const MAX_ANNUAL_TEG = 24.0; // 24%

const simulatorSchema = z.object({
  loanAmount: z.coerce.number().positive("Le montant doit être positif.").min(1000),
  duration: z.coerce.number().int().positive("La durée doit être positive."),
  periodicity: z.enum(['days', 'weeks', 'months']),
  firstInstallmentDate: z.date(),
  marginRate: z.coerce.number().min(0, "Le taux ne peut être négatif."),
  annualTeg: z.coerce.number().min(0, "Le TEG ne peut être négatif."),
  adjustmentBasis: z.enum(['margin', 'teg']).default('teg'),
});

type SimulatorFormValues = z.infer<typeof simulatorSchema>;

const getPeriodsInYear = (periodicity: 'days' | 'weeks' | 'months') => {
    switch (periodicity) {
        case 'days': return 365.25;
        case 'weeks': return 52.1786;
        case 'months': return 12;
    }
};

// Actuarial function to calculate installment amount (PMT), rounded up
const calculatePMT = (rate: number, nper: number, pv: number): number => {
    if (rate === 0) return Math.ceil(pv / nper);
    const pmt = (pv * rate) / (1 - Math.pow(1 + rate, -nper));
    return Math.ceil(pmt);
};

// Actuarial function to calculate rate (using Newton-Raphson method for precision)
const calculateRATE = (nper: number, pmt: number, pv: number, guess = 0.01, maxIter = 20, tol = 1e-6): number => {
    let rate = guess;
    for (let i = 0; i < maxIter; i++) {
        const f = pv + pmt * (1 - Math.pow(1 + rate, -nper)) / rate;
        const f_prime = pmt * ( nper * Math.pow(1+rate, -nper-1) * rate - (1 - Math.pow(1+rate,-nper)) ) / (rate*rate)
        if (f_prime === 0) return rate; // Avoid division by zero
        const newRate = rate - f / f_prime;
        if (Math.abs(newRate - rate) < tol) return newRate;
        rate = newRate;
    }
    return rate; // Fallback to last calculated rate
};

export default function AdminTegSimulator() {
    const receiptRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);
    
    const form = useForm<SimulatorFormValues>({
        resolver: zodResolver(simulatorSchema),
        defaultValues: {
            loanAmount: 50000,
            duration: 12,
            periodicity: 'weeks',
            firstInstallmentDate: addDays(new Date(), 7),
            annualTeg: 24,
            marginRate: 0,
            adjustmentBasis: 'teg',
        },
    });

    const watchedValues = form.watch();
    const { setValue, trigger } = form;

    const derivedValues = useMemo(() => {
        const { loanAmount, duration, periodicity, annualTeg, marginRate, adjustmentBasis } = watchedValues;

        if (loanAmount <= 0 || duration <= 0) return { newMarginRate: marginRate, newAnnualTeg: annualTeg };

        const periodsInYear = getPeriodsInYear(periodicity);

        if (adjustmentBasis === 'teg') {
            const periodicTeg = Math.pow(1 + annualTeg / 100, 1 / periodsInYear) - 1;
            const installment = calculatePMT(periodicTeg, duration, loanAmount);
            const calculatedMarginRate = calculateRATE(duration, -installment, loanAmount) * 100;
            return { newMarginRate: isNaN(calculatedMarginRate) ? 0 : calculatedMarginRate, newAnnualTeg: annualTeg };
        } else { // adjustmentBasis === 'margin'
            const periodicMargin = marginRate / 100;
            const installment = calculatePMT(periodicMargin, duration, loanAmount);
            const calculatedPeriodicTeg = calculateRATE(duration, -installment, loanAmount);
            const calculatedAnnualTeg = (Math.pow(1 + calculatedPeriodicTeg, periodsInYear) - 1) * 100;
            return { newMarginRate: marginRate, newAnnualTeg: isNaN(calculatedAnnualTeg) ? 0 : calculatedAnnualTeg };
        }
    }, [watchedValues]);

    useEffect(() => {
        const { newMarginRate, newAnnualTeg } = derivedValues;
        const { adjustmentBasis } = watchedValues;
        if (adjustmentBasis === 'teg' && Math.abs(newMarginRate - watchedValues.marginRate) > 0.001) {
            setValue('marginRate', newMarginRate, { shouldValidate: true });
        }
        if (adjustmentBasis === 'margin' && Math.abs(newAnnualTeg - watchedValues.annualTeg) > 0.001) {
            setValue('annualTeg', newAnnualTeg, { shouldValidate: true });
        }
    }, [derivedValues, setValue, watchedValues]);


    const results = useMemo(() => {
        const { loanAmount, duration, periodicity, firstInstallmentDate, annualTeg } = watchedValues;
        if (loanAmount > 0 && duration > 0 && firstInstallmentDate) {
            const periodsInYear = getPeriodsInYear(periodicity);
            const periodicRate = Math.pow(1 + annualTeg / 100, 1 / periodsInYear) - 1;
            
            const installmentAmount = calculatePMT(periodicRate, duration, loanAmount);
            const totalRepaid = installmentAmount * duration;
            const totalCost = totalRepaid - loanAmount;

            const schedule = [];
            let remainingBalance = loanAmount;
            let installmentDate = firstInstallmentDate;

            for (let i = 1; i <= duration; i++) {
                const interestComponent = remainingBalance * periodicRate;
                const principalComponent = installmentAmount - interestComponent;
                remainingBalance -= principalComponent;
                schedule.push({
                    number: i, date: format(installmentDate, 'dd/MM/yyyy'), payment: installmentAmount,
                    principal: principalComponent, interest: interestComponent, balance: Math.max(0, remainingBalance)
                });
                if (periodicity === 'days') installmentDate = addDays(installmentDate, 1);
                if (periodicity === 'weeks') installmentDate = addWeeks(installmentDate, 1);
                if (periodicity === 'months') installmentDate = addMonths(installmentDate, 1);
            }
            
            return { installmentAmount, totalCost, totalRepaid, schedule };
        }
        return null;
    }, [watchedValues]);
    
    const handleDownloadPDF = async () => {
        if (!jsPDF || !html2canvas || !receiptRef.current) {
            toast({ title: "Erreur", description: "Les librairies de PDF ne sont pas chargées.", variant: "destructive" });
            return;
        }
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(receiptRef.current, { scale: 3 });
            const imgData = canvas.toDataURL('image/png');
            
            const PDF = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            PDF.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            PDF.save(`echeancier-simulation-${Date.now()}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ title: "Erreur de téléchargement", description: "Impossible de générer le reçu PDF.", variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadCSV = async () => {
        if (!results) return;
        
        const Papa = (await import('papaparse')).default;
        
        const dataToExport = results.schedule.map(row => ({
            "Echeance N°": row.number,
            "Date": row.date,
            "Montant de l'echeance": row.payment.toFixed(2),
            "Principal": row.principal.toFixed(2),
            "Interets": row.interest.toFixed(2),
            "Solde Restant": row.balance.toFixed(2)
        }));

        const csv = Papa.unparse(dataToExport, { header: true });
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `echeancier-simulation-${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DialogContent className="max-w-4xl h-[90vh]">
            <DialogHeader>
                <DialogTitle>Simulateur de Crédit Conforme</DialogTitle>
                <DialogDescription>
                    Modélisez des offres de crédit. Ajustez le TEG ou le Taux de Marge pour voir l'impact sur les échéances.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 h-full overflow-hidden">
                <div className="md:col-span-1 flex flex-col gap-6">
                     <Form {...form}>
                        <form className="space-y-4">
                             <FormField control={form.control} name="loanAmount" render={({ field }) => (
                                <FormItem><FormLabel>Montant du prêt (Fcfa)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 gap-4">
                                 <FormField control={form.control} name="duration" render={({ field }) => (
                                    <FormItem><FormLabel>Durée</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="periodicity" render={({ field }) => (
                                    <FormItem><FormLabel>Périodicité</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="days">Jours</SelectItem><SelectItem value="weeks">Semaines</SelectItem><SelectItem value="months">Mois</SelectItem>
                                        </SelectContent>
                                    </Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="firstInstallmentDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Date 1ère échéance</FormLabel><Popover>
                                    <PopoverTrigger asChild><FormControl>
                                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisissez une date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                                </Popover><FormMessage /></FormItem>
                            )}/>
                            
                            <FormField control={form.control} name="adjustmentBasis" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Ajuster par</FormLabel><FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                        <FormItem><FormControl><RadioGroupItem value="teg" id="teg" /></FormControl><FormLabel htmlFor="teg" className="cursor-pointer">TEG</FormLabel></FormItem>
                                        <FormItem><FormControl><RadioGroupItem value="margin" id="margin" /></FormControl><FormLabel htmlFor="margin" className="cursor-pointer">Marge</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl><FormMessage /></FormItem>
                            )}/>

                            <FormField control={form.control} name="annualTeg" render={({ field }) => (
                                <FormItem><FormLabel>TEG Annuel (%)</FormLabel><FormControl>
                                    <Input type="number" step="0.1" {...field} disabled={watchedValues.adjustmentBasis !== 'teg'}/>
                                </FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="marginRate" render={({ field }) => (
                                <FormItem><FormLabel>Taux de Marge Périodique (%)</FormLabel><FormControl>
                                <Input type="number" step="0.01" {...field} disabled={watchedValues.adjustmentBasis !== 'margin'} />
                                </FormControl><FormMessage /></FormItem>
                            )}/>
                        </form>
                    </Form>
                     {results && (
                        <Card>
                            <CardHeader><CardTitle>Résultats</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                 <div className="flex justify-between items-baseline"><span className="text-muted-foreground">Échéance</span> <span className="text-lg font-bold text-primary">{formatCurrency(results.installmentAmount)}</span></div>
                                 <div className="flex justify-between"><span className="text-muted-foreground">Coût du crédit</span> <span>{formatCurrency(results.totalCost)}</span></div>
                                 <div className="flex justify-between"><span className="text-muted-foreground">Total remboursé</span> <span>{formatCurrency(results.totalRepaid)}</span></div>
                                 <Separator className="my-2"/>
                                 <div className="flex justify-between font-bold"><span className="text-muted-foreground">TEG Annuel</span> <span>{watchedValues.annualTeg.toFixed(2)} %</span></div>
                                 {watchedValues.annualTeg > MAX_ANNUAL_TEG && <Alert variant="destructive"><AlertTriangle/><AlertTitle>TEG Annuel Dépasse {MAX_ANNUAL_TEG}%</AlertTitle></Alert>}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="md:col-span-2 flex flex-col h-full">
                    <Card className="flex-grow flex flex-col">
                        <CardHeader>
                            <CardTitle>Plan d'Amortissement</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-hidden h-0">
                            <ScrollArea className="h-full">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-secondary z-10">
                                        <TableRow>
                                            <TableHead className="w-[50px]">N°</TableHead><TableHead>Date</TableHead>
                                            <TableHead className="text-right">Échéance</TableHead><TableHead className="text-right">Principal</TableHead>
                                            <TableHead className="text-right">Intérêts</TableHead><TableHead className="text-right">Solde</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results?.schedule.map(row => (
                                            <TableRow key={row.number}>
                                                <TableCell className="font-medium">{row.number}</TableCell><TableCell>{row.date}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.payment)}</TableCell>
                                                <TableCell className="text-right text-green-600">{formatCurrency(row.principal)}</TableCell>
                                                <TableCell className="text-right text-red-600">{formatCurrency(row.interest)}</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(row.balance)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {!results && (
                                    <div className="text-center text-muted-foreground p-8"><p>Entrez les paramètres du prêt pour générer l'échéancier.</p></div>
                                )}
                             </ScrollArea>
                        </CardContent>
                        {results && (
                            <CardContent>
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <Button variant="outline" onClick={handleDownloadCSV} disabled={isDownloading}>
                                        <Download className="mr-2"/>Exporter en CSV
                                    </Button>
                                    <Button onClick={handleDownloadPDF} disabled={isDownloading}>
                                        <Download className="mr-2"/>Télécharger en PDF
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
            
            {/* Hidden component for PDF generation */}
            <div className="absolute -z-50 -left-[9999px] -top-[9999px]">
                {results && (
                    <TegScheduleReceipt ref={receiptRef} params={watchedValues} results={results} />
                )}
            </div>
        </DialogContent>
    );
}

    
