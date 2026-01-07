"use client";

import { useMemo } from 'react';
import { useBnpl } from '@/hooks/use-bnpl';
import { useIslamicFinancing } from '@/hooks/use-islamic-financing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Check, X, Hourglass, ArrowLeft, History, ShoppingBag, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BnplRequest, BnplStatus, FinancingRequest, FinancingStatus } from '@/lib/types';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import CreditRequestDetails from './credit-request-details';
import FinancingRequestDetails from './financing-request-details';
import { formatCurrency } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const formatDate = (dateString: string) => format(new Date(dateString), 'd MMM yyyy, HH:mm', { locale: fr });

const statusConfig: Record<BnplStatus, { text: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: JSX.Element }> = {
    'review': { text: "En attente", badgeVariant: "outline", icon: <Hourglass className="h-4 w-4" /> },
    'approved': { text: "Approuvée", badgeVariant: "default", icon: <Check className="h-4 w-4" /> },
    'rejected': { text: "Rejetée", badgeVariant: "destructive", icon: <X className="h-4 w-4" /> },
};

type MyFinancingRequestsProps = {
    isStandalone?: boolean;
};

export default function MyFinancingRequests({ isStandalone = true }: MyFinancingRequestsProps) {
    const { myRequests: myBnplRequests } = useBnpl();
    const { myRequests: myFinancingRequests } = useIslamicFinancing();

    const allMyRequests = useMemo(() => {
        const bnpl = myBnplRequests.map(r => ({ ...r, type: 'BNPL', category: 'Crédit Achat' as const }));
        const financing = myFinancingRequests.map(r => ({...r, type: 'FINANCING', category: 'Financement' as const }));
        
        return [...bnpl, ...financing].sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    }, [myBnplRequests, myFinancingRequests]);


    const renderTable = () => (
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {allMyRequests.map(req => {
                    const isBnpl = req.type === 'BNPL';
                    const bnplReq = isBnpl ? (req as any) : null;
                    const finReq = !isBnpl ? (req as any) : null;

                    return (
                        <Dialog key={req.id}>
                            <DialogTrigger asChild>
                                <TableRow className="cursor-pointer">
                                    <TableCell>{formatDate(req.requestDate)}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="gap-1">
                                            {isBnpl ? <ShoppingBag size={12}/> : <Landmark size={12}/>}
                                            {req.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatCurrency(req.amount)}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusConfig[req.status].badgeVariant} className="gap-1">
                                            {statusConfig[req.status].icon} {statusConfig[req.status].text}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            </DialogTrigger>
                             <DialogContent className="max-w-2xl">
                                {isBnpl && bnplReq && <CreditRequestDetails request={bnplReq} />}
                                {!isBnpl && finReq && <FinancingRequestDetails request={finReq} />}
                            </DialogContent>
                        </Dialog>
                    )
                })}
            </TableBody>
        </Table>
    );

    if (isStandalone) {
        return (
            <div>
                 <div className="flex items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">Mes Demandes de Financement</h2>
                        <p className="text-muted-foreground">Consultez l'historique et le statut de vos demandes.</p>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Historique des Demandes</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {allMyRequests.length > 0 ? renderTable() : (
                             <div className="text-center p-10">
                                <History className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 font-semibold">Aucune demande de financement</p>
                                <p className="text-sm text-muted-foreground">Vous n'avez pas encore fait de demande.</p>
                            </div>
                       )}
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Accordion view
    if (allMyRequests.length > 0) {
        return (
            <Accordion type="single" collapsible className="w-full mb-6">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="flex items-center gap-2">
                             <History className="h-5 w-5" /> Voir l'historique de vos demandes
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card>
                            <CardContent className="p-2">
                                {renderTable()}
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        );
    }

    return null;
}
