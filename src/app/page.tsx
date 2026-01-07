

'use client';

import { useState, useMemo } from 'react';
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
import { User, Shield, Building, Loader2 } from 'lucide-react';
import type { ManagedUser, Transaction } from '@/lib/types';
import { UserManagementContext } from '@/hooks/use-user-management';
import { useUser } from '@/firebase';
import { AccountProvider, type Account } from '@/hooks/use-account';

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

const mockUsers: Record<string, UserInfo & Partial<ManagedUser>> = {
    user: {
        id: 'user-sim-001',
        firstName: 'Awa',
        lastName: 'Diallo',
        name: 'Awa Diallo',
        email: 'awa.diallo@example.com',
        role: 'user',
        alias: '771234567',
        phoneNumber: '771234567',
        isSuspended: false,
        balance: 150000,
        avatar: null,
    },
    merchant: {
        id: 'merchant-sim-001',
        firstName: 'Lamine',
        lastName: 'Diop',
        name: 'Boutique Lamine',
        email: 'lamine@boutique.sn',
        role: 'merchant',
        alias: '781234567',
        phoneNumber: '781234567',
        isSuspended: false,
        balance: 785000,
        avatar: null,
        merchantCode: 'lamine-shop',
        brandName: 'Boutique Lamine',
        ninea: 'NINEA001',
        rccm: 'RCCM001',
    },
    admin: {
        id: 'admin-sim-001',
        firstName: 'Admin',
        lastName: 'Midi',
        name: 'Admin Midi',
        email: 'admin@midi.sn',
        role: 'admin',
        alias: '701234567',
        phoneNumber: '701234567',
        isSuspended: false,
        balance: 0,
        avatar: null,
    }
}

const allMockUsers: ManagedUser[] = Object.values(mockUsers).map(u => u as ManagedUser);

const allMockTransactions: Transaction[] = [
    { id: 'tx1', accountId: 'acc_user_user-sim-001', type: 'received', counterparty: 'Lamine Diop', reason: 'Remboursement', amount: 25000, date: new Date().toISOString(), status: 'Terminé' },
    { id: 'tx2', accountId: 'acc_user_user-sim-001', type: 'sent', counterparty: 'SENELEC', reason: 'Facture électricité', amount: 15000, date: new Date(Date.now() - 86400000).toISOString(), status: 'Terminé' },
    { id: 'tx3', accountId: 'acc_merchant_merchant-sim-001', type: 'received', counterparty: 'Awa Diallo', reason: 'Achat en boutique', amount: 5000, date: new Date().toISOString(), status: 'Terminé' },
];


// A single wrapper for all providers that depend on a user alias
const AppProviders = ({ account, children }: { account: Account, children: React.ReactNode }) => {
    
    return (
          <AccountProvider account={account}>
            <TransactionsProvider>
                <CmsProvider>
                    <ProductProvider>
                        <FeatureFlagProvider>
                            <RoleProvider>
                                <MonthlyBudgetProvider>
                                    <BalanceProvider alias={account.accountId}>
                                        <BnplProvider alias={account.accountId}>
                                            <IslamicFinancingProvider alias={account.accountId}>
                                                <AvatarProvider alias={account.accountId}>
                                                    <ContactsProvider alias={account.accountId}>
                                                        <VirtualCardProvider alias={account.accountId}>
                                                            <VaultsProvider alias={account.accountId}>
                                                                <TontineProvider alias={account.accountId}>
                                                                    <RecurringPaymentsProvider alias={account.accountId}>
                                                                        <TreasuryProvider>
                                                                            {children}
                                                                        </TreasuryProvider>
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
            </TransactionsProvider>
          </AccountProvider>
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
    const { isUserLoading } = useUser();
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const { toast } = useToast();
    
    const userManagementValue = {
        users: allMockUsers,
        changeUserPin: (alias: string, oldPin: string, newPin:string) : {success: boolean, message: string} => {
            if (oldPin.length === 4 && /^\d+$/.test(oldPin)) {
                console.log(`PIN for ${alias} verified successfully (simulation).`);
                return { success: true, message: "PIN vérifié (simulation)." };
            }
            console.warn("PIN verification failed in simulation mode.");
            return {success: false, message: "PIN incorrect (simulation)."};
        }
    };

    const handleLogout = () => {
        setUserInfo(null);
        toast({ title: "Déconnexion simulée", description: "Vous êtes revenu au sélecteur de profil." });
    }
    
    const handleSelectProfile = (profile: UserInfo) => {
        // In simulation, we store the alias to persist data across reloads
        localStorage.setItem('midi_last_alias', profile.alias);
        setUserInfo(profile);
    }
    
    if (isUserLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Chargement de la session...</p>
            </div>
        );
    }
    
    const renderDashboard = () => {
        if (!userInfo) return null;
        
        let account: Account;
        switch (userInfo.role) {
            case 'merchant':
                account = { accountId: `acc_merchant_${userInfo.id}`, type: 'merchant' };
                return (
                    <AppProviders account={account}>
                        <MerchantDashboard userInfo={userInfo} alias={userInfo.alias} onLogout={handleLogout} />
                    </AppProviders>
                );
            case 'admin':
            case 'superadmin':
            case 'support':
                const adminAccount: Account = { accountId: `acc_admin_${userInfo.id}`, type: 'user' };
                 return (
                    <AccountProvider account={adminAccount}>
                      <TransactionsProvider>
                        <CmsProvider>
                            <ProductProvider>
                                <RoleProvider>
                                    <FeatureFlagProvider>
                                        <BalanceProvider alias="admin_sim_balance">
                                            <BnplProvider alias="admin_sim_bnpl">
                                                <IslamicFinancingProvider alias="admin_sim_islamic">
                                                    <TreasuryProvider>
                                                        <AdminDashboard onExit={handleLogout} allUsers={allMockUsers} allTransactions={allMockTransactions} />
                                                    </TreasuryProvider>
                                                </IslamicFinancingProvider>
                                            </BnplProvider>
                                        </BalanceProvider>
                                    </FeatureFlagProvider>
                                </RoleProvider>
                            </ProductProvider>
                        </CmsProvider>
                      </TransactionsProvider>
                    </AccountProvider>
                 );
            case 'user':
            default:
                 account = { accountId: `acc_user_${userInfo.id}`, type: 'user' };
                 return (
                     <AppProviders account={account}>
                        <Dashboard alias={userInfo.alias} userInfo={userInfo} onLogout={handleLogout} />
                    </AppProviders>
                 )
        }
    };
  
    return (
         <UserManagementContext.Provider value={userManagementValue}>
            <main className="bg-background min-h-screen">
                {userInfo ? renderDashboard() : (
                    <CmsProvider>
                        <SimulatorSelector onSelectProfile={handleSelectProfile} />
                    </CmsProvider>
                )}
            </main>
        </UserManagementContext.Provider>
    );
}

export default function AuthenticationGate() {
    return <SimulatedApp />;
}
