
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, HandCoins, FileText, ArrowLeft, Download, AlertTriangle, Loader2 } from 'lucide-react';
import AdminTransactionAnalysis from "./admin-transaction-analysis";
import { useBnpl } from "@/hooks/use-bnpl";
import { useIslamicFinancing } from "@/hooks/use-islamic-financing";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Transaction } from '@/lib/types';

type ReportView = 'hub' | 'activity' | 'financing';

const ReportCard = ({ title, description, icon, onClick }: { title: string, description: string, icon: JSX.Element, onClick: () => void }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <div className="p-3 bg-primary/10 rounded-full text-primary">{icon}</div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <CardDescription>{description}</CardDescription>
        </CardContent>
    </Card>
);

const FinancingReport = () => {
    const { kpis: bnplKpis } = useBnpl();
    // Assuming islamic financing hook will also export KPIs
    // const { kpis: islamicKpis } = useIslamicFinancing();
    
    const handleExport = () => {
        toast({
            title: "Exportation en cours (simulation)",
            description: "Le rapport de financement sera téléchargé au format Excel.",
        })
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Crédits Achat Approuvés</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(bnplKpis.totalApprovedAmount)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Demandes en Attente (BNPL)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{bnplKpis.pendingRequests}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Taux d'approbation (BNPL)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{bnplKpis.approvalRate.toFixed(1)}%</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Financements Internes</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">N/A</div></CardContent>
                </Card>
            </div>
            <div className="flex justify-end">
                <Button onClick={handleExport}><Download className="mr-2"/> Exporter le Rapport</Button>
            </div>
        </div>
    )
}

const RegulatoryReports = ({ allTransactions }: { allTransactions: Transaction[] }) => {
    const [generating, setGenerating] = useState<string | null>(null);
    
    const reports = [
        { id: 'bceao_usage', name: 'Rapport BCEAO - Utilisation des Services', description: 'Statistiques mensuelles sur l\'émission de monnaie électronique.' },
        { id: 'lcb_ft', name: 'Déclaration LCB-FT', description: 'Rapport sur les transactions suspectes ou inhabituelles.' },
        { id: 'financial_statements', name: 'États Financiers Trimestriels', description: 'Bilan, compte de résultat et tableau de flux de trésorerie.' },
    ];
    
    const handleGenerate = async (reportId: string, reportName: string) => {
        setGenerating(reportId);
        toast({
            title: "Génération en cours...",
            description: `Le rapport "${reportName}" est en cours de préparation.`,
        });

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Use real transaction data
        const dataToExport = allTransactions.map(tx => ({
            'ID Transaction': tx.id,
            'ID Utilisateur': tx.userId,
            'Date': (tx.date as any)?.toDate ? (tx.date as any).toDate().toISOString() : tx.date,
            'Type': tx.type,
            'Contrepartie': tx.counterparty,
            'Raison': tx.reason,
            'Montant': tx.amount,
            'Statut': tx.status,
        }));

        if (dataToExport.length === 0) {
            toast({
                title: "Aucune donnée",
                description: "Il n'y a aucune transaction à exporter pour ce rapport.",
                variant: "destructive"
            });
            setGenerating(null);
            return;
        }

        try {
            const Papa = (await import('papaparse')).default;
            const csv = Papa.unparse(dataToExport, { header: true });
            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${reportId}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({
                title: "Rapport Généré",
                description: `Le rapport "${reportName}" a été téléchargé.`,
            });
        } catch (error) {
            console.error("CSV generation failed", error);
            toast({
                title: "Erreur de génération",
                description: "Impossible de créer le fichier de rapport.",
                variant: "destructive"
            });
        } finally {
            setGenerating(null);
        }
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle/> États Réglementaires</CardTitle>
                <CardDescription>Générez les rapports requis par les autorités de régulation. Ces opérations sont enregistrées.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {reports.map(report => (
                    <div key={report.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                            <p className="font-semibold">{report.name}</p>
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                        </div>
                        <Button 
                            variant="secondary" 
                            onClick={() => handleGenerate(report.id, report.name)}
                            disabled={generating === report.id}
                        >
                            {generating === report.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            ) : (
                                <Download className="mr-2 h-4 w-4"/>
                            )}
                            Générer
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export default function AdminReportingHub({ allTransactions }: { allTransactions: Transaction[] }) {
    const [view, setView] = useState<ReportView>('hub');
    
    const renderContent = () => {
        switch(view) {
            case 'activity':
                return <AdminTransactionAnalysis allTransactions={allTransactions} />;
            case 'financing':
                return <FinancingReport />;
            default:
                return (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ReportCard
                                title="Rapport d'Activité"
                                description="Analyse des transactions, des flux de paiements et des commissions."
                                icon={<BarChart3 />}
                                onClick={() => setView('activity')}
                            />
                            <ReportCard
                                title="Rapport de Financement"
                                description="Indicateurs clés sur les crédits accordés, les demandes et les remboursements."
                                icon={<HandCoins />}
                                onClick={() => setView('financing')}
                            />
                        </div>
                        <RegulatoryReports allTransactions={allTransactions} />
                    </div>
                );
        }
    }
    
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                {view !== 'hub' && (
                    <Button variant="outline" onClick={() => setView('hub')}>
                        <ArrowLeft className="mr-2"/> Retour
                    </Button>
                )}
                <div>
                    <h2 className="text-3xl font-bold">Centre de Reporting &amp; RegTech</h2>
                    <p className="text-muted-foreground">Générez et exportez des rapports pour l'analyse et la conformité.</p>
                </div>
            </div>
            {renderContent()}
        </div>
    );
}
