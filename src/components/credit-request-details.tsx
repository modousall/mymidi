

"use client";

import type { BnplRequest, BnplStatus } from "@/lib/types";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Check, X, Hourglass, Info, Download, FileText } from 'lucide-react';
import { Progress } from "./ui/progress";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const formatDate = (dateString: string) => format(new Date(dateString), 'd MMMM yyyy, HH:mm', { locale: fr });

const statusConfig: Record<BnplStatus, { text: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: JSX.Element }> = {
    'review': { text: "Examen Requis", badgeVariant: "outline", icon: <Hourglass className="h-4 w-4" /> },
    'approved': { text: "Approuvée", badgeVariant: "default", icon: <Check className="h-4 w-4" /> },
    'rejected': { text: "Rejetée", badgeVariant: "destructive", icon: <X className="h-4 w-4" /> },
};

const DetailRow = ({ label, value }: { label: string, value: string | React.ReactNode }) => (
    <div className="flex justify-between items-start py-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-right">{value}</span>
    </div>
);

export default function CreditRequestDetails({ request }: { request: BnplRequest }) {
    const statusInfo = statusConfig[request.status];
    const repaidAmount = request.repaidAmount ?? 0;
    const progress = request.status === 'approved' ? (repaidAmount / request.amount) * 100 : 0;
    
    const handleDownloadPV = () => {
        // Simulation of PDF generation
        toast({
            title: "Génération de PV...",
            description: "Le Procès-Verbal de la décision est en cours de téléchargement (simulation).",
        });
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FileText /> Procès-Verbal de Décision de Crédit</DialogTitle>
                <DialogDescription>
                    Demande de {request.alias} pour un achat chez {request.merchantAlias}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 text-sm">
                
                <div className="p-4 bg-secondary rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Montant du crédit demandé</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(request.amount)}</p>
                </div>
                
                <DetailRow label="Date de la demande" value={formatDate(request.requestDate)} />
                <DetailRow label="Décision du moteur" value={
                    <Badge variant={statusInfo.badgeVariant} className="gap-1 text-sm">
                        {statusInfo.icon} {statusInfo.text}
                    </Badge>
                } />

                <Alert variant={request.status === 'rejected' ? 'destructive' : 'default'}>
                    <Info className="h-4 w-4" />
                    <AlertTitle className="font-bold">Justification du Moteur de Décision</AlertTitle>
                    <AlertDescription>
                        {request.reason}
                    </AlertDescription>
                </Alert>
                
                {request.status === 'approved' && (
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-semibold">Plan de Remboursement</h4>
                         <div className="p-4 border rounded-md">
                           <p className="text-muted-foreground text-center">{request.repaymentPlan}</p>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{formatCurrency(repaidAmount)} remboursés</span>
                                <span>{formatCurrency(request.amount)}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-right mt-1">{progress.toFixed(0)}%</p>
                        </div>
                    </div>
                )}

            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Fermer</Button></DialogClose>
                <Button onClick={handleDownloadPV}><Download className="mr-2"/> Télécharger le PV</Button>
            </DialogFooter>
        </>
    )
}
