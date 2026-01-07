
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, BarChart3, Landmark, QrCode, Clock, Link as LinkIcon, HandCoins, ArrowDownCircle, CheckSquare } from 'lucide-react';
import QrCodeDisplay from './qr-code-display';
import { useBalance } from "@/hooks/use-balance";
import TransactionHistory from "./transaction-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from "./ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { useTransactions } from "@/hooks/use-transactions";
import MerchantCreditProposalForm from "./merchant-credit-proposal-form";
import PICASH from "./picash";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import RedeemCodeForm from "./redeem-code-form";
import { useUserManagement } from "@/hooks/use-user-management";

type UserInfo = {
    name: string;
    email: string;
    role: 'user' | 'merchant' | 'admin' | 'superadmin' | 'support';
}

type MerchantDashboardProps = {
    onLogout: () => void;
    userInfo: UserInfo;
    alias: string;
};

const KPIs = () => {
    const { balance } = useBalance();
    const { transactions } = useTransactions();
    
    const today = new Date().toISOString().split('T')[0];
    const todaysTransactions = transactions.filter(tx => tx.date.startsWith(today) && tx.type === 'received');
    const todaysRevenue = todaysTransactions.reduce((acc, tx) => acc + tx.amount, 0);

    const kpiData = [
        { title: "Chiffre d'affaires (Aujourd'hui)", value: formatCurrency(todaysRevenue) },
        { title: "Transactions (Aujourd'hui)", value: todaysTransactions.length },
        { title: "Solde Marchand Actuel", value: formatCurrency(balance) },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {kpiData.map(kpi => (
                <Card key={kpi.title}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{kpi.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

const paymentRequestSchema = z.object({
    amount: z.coerce.number().positive("Le montant doit être positif."),
    reason: z.string().optional(),
});
type PaymentRequestValues = z.infer<typeof paymentRequestSchema>;

const RequestPaymentDialogContent = ({ alias, userInfo, onGenerate }: { alias: string, userInfo: UserInfo, onGenerate: (link: string) => void }) => {
    const form = useForm<PaymentRequestValues>({
        resolver: zodResolver(paymentRequestSchema),
        defaultValues: { amount: '' as any, reason: "" },
    });

    const onSubmit = (values: PaymentRequestValues) => {
        const params = new URLSearchParams({
            to: alias,
            amount: values.amount.toString(),
            reason: values.reason || `Paiement pour ${userInfo.name}`
        });
        const paymentLink = `${window.location.origin}?pay=${params.toString()}`;
        onGenerate(paymentLink);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Montant (F)</FormLabel>
                        <FormControl><Input type="number" placeholder="ex: 1500" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="reason" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Raison / Description (Optionnel)</FormLabel>
                        <FormControl><Input placeholder="ex: Facture #42" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-4">
                    <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
                    <Button type="submit">Générer le lien</Button>
                </div>
            </form>
        </Form>
    );
}

export default function MerchantDashboard({ onLogout, userInfo, alias }: MerchantDashboardProps) {
    const [isProposalFormOpen, setIsProposalFormOpen] = useState(false);
    const [activeAction, setActiveAction] = useState<'none' | 'customer_withdrawal'>('none');
    const [paymentLink, setPaymentLink] = useState<string | null>(null);
    const { toast } = useToast();
    const { addTransaction } = useTransactions();
  
    if (activeAction === 'customer_withdrawal') {
        return (
             <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PICASH onBack={() => setActiveAction('none')} userInfo={userInfo}/>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-secondary">
            <header className="bg-background border-b shadow-sm sticky top-0 z-10">
                <div className="container mx-auto p-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-primary">Tableau de Bord - {userInfo.name}</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onLogout}>
                            <LogOut className="mr-2" /> Déconnexion
                        </Button>
                    </div>
                </div>
            </header>
            
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 <Tabs defaultValue="cash-in" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-12">
                        <TabsTrigger value="cash-in" className="h-full text-base"><QrCode className="mr-2"/>Encaisser</TabsTrigger>
                        <TabsTrigger value="dashboard" className="h-full text-base"><BarChart3 className="mr-2"/>Tableau de Bord</TabsTrigger>
                    </TabsList>

                    <TabsContent value="cash-in" className="mt-6">
                        <Card className="max-w-2xl mx-auto">
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl">Recevoir un Paiement</CardTitle>
                                <CardDescription>Présentez votre code au client ou demandez-lui un paiement.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-6">
                                <div className="p-4 bg-white rounded-lg shadow-md">
                                    <QrCodeDisplay alias={alias} userInfo={userInfo} simpleMode={true} />
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                    <Dialog onOpenChange={(open) => !open && setPaymentLink(null)}>
                                        <DialogTrigger asChild>
                                            <Button size="lg" className="h-20 sm:h-16 w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm flex-col gap-1">
                                                <LinkIcon/> Lien
                                            </Button>
                                        </DialogTrigger>
                                        {paymentLink ? (
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Lien de Paiement Généré</DialogTitle>
                                                    <DialogDescription>Partagez ce lien avec votre client pour qu'il puisse vous payer facilement.</DialogDescription>
                                                </DialogHeader>
                                                <Input readOnly value={paymentLink} />
                                                <DialogFooter>
                                                    <Button variant="secondary" onClick={() => {
                                                        if (!paymentLink) return;
                                                        navigator.clipboard.writeText(paymentLink);
                                                        toast({ title: "Lien copié !", description: "Le lien de paiement a été copié dans le presse-papiers." });
                                                    }}><LinkIcon className="mr-2"/> Copier & Partager</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        ) : (
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Demander un paiement par lien</DialogTitle></DialogHeader>
                                                <RequestPaymentDialogContent alias={alias} userInfo={userInfo} onGenerate={setPaymentLink} />
                                            </DialogContent>
                                        )}
                                    </Dialog>
                                    <Dialog open={isProposalFormOpen} onOpenChange={setIsProposalFormOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="lg" variant="secondary" className="bg-purple-600 text-white hover:bg-purple-700 h-20 sm:h-16 w-full flex-col gap-1">
                                                <HandCoins/> Achat credit
                                            </Button>
                                        </DialogTrigger>
                                        <MerchantCreditProposalForm 
                                            merchantAlias={alias}
                                            merchantInfo={userInfo}
                                            onClose={() => setIsProposalFormOpen(false)}
                                        />
                                     </Dialog>
                                </div>
                                 <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                      <Button size="lg" variant="secondary" className="h-20 sm:h-16 w-full shadow-sm flex-col gap-1" onClick={() => setActiveAction('customer_withdrawal')}>
                                        <ArrowDownCircle/> Retrait client
                                    </Button>
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="lg" variant="outline" className="h-20 sm:h-16 w-full shadow-sm flex-col gap-1">
                                                <CheckSquare/> Valider un Code
                                            </Button>
                                        </DialogTrigger>
                                        <RedeemCodeForm addTransaction={(tx) => addTransaction(tx, alias)} />
                                     </Dialog>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="dashboard" className="mt-6 space-y-6">
                        <KPIs />
                        <Card>
                            <CardHeader>
                                <CardTitle>Historique</CardTitle>
                                <CardDescription>Liste de toutes les transactions sur votre compte marchand.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TransactionHistory showAll={true} onShowAll={() => {}} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
