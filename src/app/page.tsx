'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BalanceProvider } from '@/hooks/use-balance';
import { ContactsProvider } from '@/hooks/use-contacts';
import { TontineProvider } from '@/hooks/use-tontine';
import { TransactionsProvider } from '@/hooks/use-transactions';
import { VaultsProvider } from '@/hooks/use-vaults';
import { VirtualCardProvider } from '@/hooks/use-virtual-card';
import { FeatureFlagProvider } from '@/hooks/use-feature-flags';
import { ProductProvider } from '@/hooks/use-product-management';
import { RoleProvider } from '@/hooks/use-role-management';
import { MonthlyBudgetProvider } from '@/hooks/use-monthly-budget';
import { BnplProvider } from '@/hooks/use-bnpl';
import { IslamicFinancingProvider } from '@/hooks/use-islamic-financing';
import { TreasuryProvider } from '@/hooks/use-treasury-management';
import { CmsProvider } from '@/hooks/use-cms';
import { RecurringPaymentsProvider } from '@/hooks/use-recurring-payments';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import Dashboard from '@/components/dashboard';
import { AvatarProvider } from '@/hooks/use-avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Shield, Building } from 'lucide-react';


const AdminDashboard = dynamic(() => import('@/components/admin-dashboard'), {
  loading: () => <div className="h-screen w-full flex items-center justify-center"><Skeleton className="h-24 w-1/3" /></div>,
  ssr: false,
});
const MerchantDashboard = dynamic(() => import('@/components/merchant-dashboard'), {
  loading: () => <div className="h-screen w-full flex items-center justify-center"><Skeleton className="h-24 w-1/3" /></div>,
  ssr: false,
});


type UserInfo = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: 'user' | 'merchant' | 'admin' | 'superadmin' | 'support' | 'agent';
  alias: string;
  isSuspended: boolean;
};

const mockUsers: Record<string, UserInfo> = {
    user: {
        id: 'user-sim-001',
        firstName: 'Awa',
        lastName: 'Diallo',
        name: 'Awa Diallo',
        email: 'awa.diallo@example.com',
        role: 'user',
        alias: '771234567',
        isSuspended: false,
    },
    merchant: {
        id: 'merchant-sim-001',
        firstName: 'Lamine',
        lastName: 'Diop',
        name: 'Boutique Lamine',
        email: 'lamine@boutique.sn',
        role: 'merchant',
        alias: '781234567',
        isSuspended: false,
    },
    admin: {
        id: 'admin-sim-001',
        firstName: 'Admin',
        lastName: 'Midi',
        name: 'Admin Midi',
        email: 'admin@midi.sn',
        role: 'admin',
        alias: '701234567',
        isSuspended: false,
    }
}


// A single wrapper for all providers that depend on a user alias
const AppProviders = ({ userId, alias, children }: { userId: string, alias: string, children: React.ReactNode }) => {
    return (
        <TransactionsProvider forUserId={userId}>
            <TreasuryProvider>
                <CmsProvider>
                    <ProductProvider addSettlementTransaction={(tx: any) => console.log(tx)}>
                        <FeatureFlagProvider>
                            <RoleProvider>
                                <MonthlyBudgetProvider>
                                    <BalanceProvider alias={alias}>
                                        <BnplProvider alias={alias}>
                                            <IslamicFinancingProvider alias={alias}>
                                                <AvatarProvider alias={alias}>
                                                    <ContactsProvider alias={alias}>
                                                        <VirtualCardProvider alias={alias}>
                                                            <VaultsProvider alias={alias}>
                                                                <TontineProvider alias={alias}>
                                                                    <RecurringPaymentsProvider alias={alias}>
                                                                        {children}
                                                                    </RecurringPaymentsProvider>
                                                                </TontineProvider>
                                                            </VaultsProvider>
                                                        </VirtualCardProvider>
                                                    </ContactsProvider>
                                                </AvatarProvider>
                                            </IslamicFinancingProvider>
                                        </BnplProvider>
                                    </BalanceProvider>
                                </MonthlyBudgetProvider>
                            </RoleProvider>
                        </FeatureFlagProvider>
                    </ProductProvider>
                </CmsProvider>
            </TreasuryProvider>
        </TransactionsProvider>
    )
}

function SimulatorSelector({ onSelectProfile }: { onSelectProfile: (profile: UserInfo) => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Sélecteur de Profil (Simulation)</CardTitle>
                    <CardDescription>Choisissez un profil pour tester l'application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full justify-start h-14" onClick={() => onSelectProfile(mockUsers.user)}>
                        <User className="mr-4"/>
                        <div>
                            <p>Utilisateur Standard</p>
                            <p className="text-xs text-primary-foreground/80">Awa Diallo</p>
                        </div>
                    </Button>
                     <Button className="w-full justify-start h-14" variant="secondary" onClick={() => onSelectProfile(mockUsers.merchant)}>
                        <Building className="mr-4"/>
                        <div>
                            <p>Marchand</p>
                             <p className="text-xs text-secondary-foreground/80">Boutique Lamine</p>
                        </div>
                    </Button>
                     <Button className="w-full justify-start h-14" variant="destructive" onClick={() => onSelectProfile(mockUsers.admin)}>
                        <Shield className="mr-4"/>
                        <div>
                            <p>Administrateur</p>
                             <p className="text-xs text-destructive-foreground/80">Admin Midi</p>
                        </div>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

function SimulatedApp() {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const { toast } = useToast();
    
    const handleLogout = () => {
        setUserInfo(null);
        toast({ title: "Déconnexion simulée", description: "Vous êtes revenu au sélecteur de profil." });
    }
    
    const renderDashboard = () => {
        if (!userInfo) return null;
        
        switch (userInfo.role) {
            case 'merchant':
                return <MerchantDashboard userInfo={userInfo} alias={userInfo.alias} onLogout={handleLogout} />;
            case 'admin':
            case 'superadmin':
            case 'support':
                return <AdminDashboard onExit={handleLogout} />;
            case 'user':
            default:
                return <Dashboard alias={userInfo.alias} userInfo={userInfo} onLogout={handleLogout} />;
        }
    };
  
    return (
        <main className="bg-background min-h-screen">
            {userInfo ? (
                <AppProviders userId={userInfo.id} alias={userInfo.alias}>
                   {renderDashboard()}
                </AppProviders>
            ) : (
                <CmsProvider>
                    <SimulatorSelector onSelectProfile={setUserInfo} />
                </CmsProvider>
            )}
        </main>
    );
}

export default function AuthenticationGate() {
    return <SimulatedApp />;
}
