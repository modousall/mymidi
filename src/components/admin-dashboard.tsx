

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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query } from 'firebase/firestore';
import type { ManagedUser, Transaction } from '@/lib/types';


const useAdminData = () => {
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users');
    }, [firestore]);
    const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useCollection<Omit<ManagedUser, 'id' | 'name'>>(usersQuery as any);
    
    const users = useMemo(() => {
        if (!usersData) return [];
        return usersData.map(u => ({ ...u, id: u.id, name: `${u.firstName} ${u.lastName}` })) as ManagedUser[];
    }, [usersData]);

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'transactions'));
    }, [firestore]);
    const { data: allTransactions, isLoading: isLoadingTransactions, error: transactionsError } = useCollection<Transaction>(transactionsQuery as any);

    return {
        users: users || [],
        allTransactions: allTransactions || [],
        isLoading: isLoadingUsers || isLoadingTransactions,
        error: usersError || transactionsError,
    }
}


type AdminDashboardProps = {
    onExit: () => void;
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

export default function AdminDashboard({ onExit }: AdminDashboardProps) {
    const [view, setView] = useState<AdminView>('dashboard');
    const { users, allTransactions, isLoading, error } = useAdminData();

    // The refreshUsers function is simulated here as it depends on the useCollection hook's internal refresh logic which is not exposed.
    // In a real scenario with more complex state management (like Redux or Zustand), this would be handled differently.
    const refreshUsers = () => {
        // This is a placeholder. The `useCollection` hook automatically refreshes on data change.
        // For manual refresh, you might need to trigger a re-fetch, e.g., by changing a dependency of the useMemoFirebase.
        console.log("Simulating user refresh...");
    }

    if (error) {
        // This is a simplified error display. In a real app, you'd have a more robust error boundary.
        return (
             <div className="flex h-screen items-center justify-center">
                <Card className="w-1/2 bg-destructive/10 border-destructive text-destructive-foreground">
                    <CardHeader>
                        <CardTitle>Erreur d'accès aux données</CardTitle>
                        <CardDescription>Impossible de charger les données administrateur. Vérifiez vos permissions de sécurité.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="font-mono text-xs">{error.message}</p>
                         <Button onClick={onExit} className="mt-4">Quitter</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const renderContent = () => {
        if (isLoading && view !== 'dashboard') {
            return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
        }

        switch(view) {
            case 'users':
                return <AdminUserManagement allUsers={users} refreshUsers={refreshUsers} />;
            case 'merchants':
                return <AdminMerchantManagement allUsers={users} refreshUsers={refreshUsers} />;
            case 'transactions':
                return <AdminTransactionAnalysis allTransactions={allTransactions} />;
            case 'financing':
                return <AdminFinancingHub allUsers={users} />;
            case 'cash':
                return <AdminCashManagement />;
            case 'cms':
                return <AdminCms />;
            case 'reporting':
                return <AdminReportingHub allTransactions={allTransactions} />;
            case 'services':
                return <AdminFeatureManagement allUsers={users} />;
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
