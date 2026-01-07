
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Users, BarChart3, ShieldCheck, Blocks, Building, HandCoins, TrendingUp, LayoutTemplate, FileText, Loader2 } from 'lucide-react';
import AdminUserManagement from "./admin-user-management";
import AdminTransactionAnalysis from "./admin-transaction-analysis";
import AdminRoleManagement from "./admin-role-management";
import AdminFeatureManagement from "./admin-feature-management";
import AdminMerchantManagement from "./admin-merchant-management";
import AdminFinancingHub from "./admin-financing-hub";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import AdminCashManagement from "./admin-cash-management";
import AdminCms from "./admin-cms";
import AdminReportingHub from "./admin-reporting-hub";
import type { ManagedUser, Transaction } from '@/lib/types';


type AdminDashboardProps = {
    onExit: () => void;
    allUsers: ManagedUser[];
    allTransactions: Transaction[];
};

type AdminView = 'dashboard' | 'users' | 'merchants' | 'transactions' | 'roles' | 'services' | 'financing' | 'cash' | 'cms' | 'reporting';

const adminFeatures: {id: AdminView, title: string, description: string, icon: JSX.Element}[] = [
    { id: "users", title: "Gestion des Utilisateurs", description: "Consulter, modifier et gérer les clients particuliers.", icon: <Users /> },
    { id: "merchants", title: "Gestion des Marchands", description: "Gérer les comptes et les profils des marchands.", icon: <Building /> },
    { id: "transactions", title: "Analyse des Revenus", description: "Visualiser les statistiques, les flux et les commissions.", icon: <BarChart3 /> },
    { id: "financing", title: "Gestion des Financements", description: "Examiner les demandes de crédit et de financement.", icon: <HandCoins /> },
    { id: "cash", title: "Gestion de Trésorerie", description: "Piloter les fonds propres et les avoirs de la plateforme.", icon: <TrendingUp /> },
    { id: "reporting", title: "Reporting & RegTech", description: "Générez des rapports d'activité, de financement et des états réglementaires.", icon: <FileText /> },
    { id: "cms", title: "Gestion de Contenu", description: "Modifier les textes et images de la landing page.", icon: <LayoutTemplate /> },
    { id: "services", title: "Gestion des Services", description: "Configurer les fonctionnalités et les facturiers.", icon: <Blocks /> },
    { id: "roles", title: "Rôles et Permissions", description: "Gérer les niveaux d'accès administratifs.", icon: <ShieldCheck /> },
]

export default function AdminDashboard({ onExit, allUsers, allTransactions }: AdminDashboardProps) {
    const [view, setView] = useState<AdminView>('dashboard');

    const getTransactionsForUser = (user: ManagedUser) => {
        const accountId = user.role === 'merchant' ? `acc_merchant_${user.id}` : `acc_user_${user.id}`;
        return allTransactions.filter(tx => tx.accountId === accountId);
    }

    const renderContent = () => {
        switch(view) {
            case 'users':
                return <AdminUserManagement allUsers={allUsers} refreshUsers={() => {}} allTransactions={allTransactions} />;
            case 'merchants':
                return <AdminMerchantManagement allUsers={allUsers} refreshUsers={() => {}} allTransactions={allTransactions} />;
            case 'transactions':
                return <AdminTransactionAnalysis allTransactions={allTransactions} />;
            case 'financing':
                return <AdminFinancingHub allUsers={allUsers} />;
            case 'cash':
                return <AdminCashManagement />;
            case 'cms':
                return <AdminCms />;
            case 'reporting':
                return <AdminReportingHub allTransactions={allTransactions} />;
            case 'services':
                return <AdminFeatureManagement allUsers={allUsers} />;
            case 'roles':
                 return <AdminRoleManagement />;
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {adminFeatures.map(feature => (
                            <Card key={feature.title} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView(feature.id)}>
                                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                    <div className="p-3 bg-primary/10 rounded-full text-primary">{feature.icon}</div>
                                    <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>{feature.description}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
        }
    }

  return (
    <div className="min-h-screen bg-secondary">
        <header className="bg-background border-b shadow-sm sticky top-0 z-20">
            <div className="container mx-auto p-4 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    {view !== 'dashboard' && (
                        <Button variant="outline" onClick={() => setView('dashboard')}>
                            Retour
                        </Button>
                    )}
                    <h1 className="text-xl font-bold text-primary">Backoffice</h1>
                 </div>
                 <Button variant="ghost" onClick={onExit}>
                    <LogOut className="mr-2" /> Quitter
                </Button>
            </div>
        </header>
        
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            {view === 'dashboard' && (
                <div className="mb-8">
                    <h2 className="text-3xl font-bold">Bienvenue, Admin !</h2>
                    <p className="text-muted-foreground">Pilotez et contrôlez la plateforme Midi depuis ce tableau de bord.</p>
                </div>
            )}
            {renderContent()}
        </main>
    </div>
  );
}
