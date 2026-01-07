'use client';

import { useState, useEffect } from 'react';
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
import { FirebaseClientProvider, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import AuthForm from '@/components/login-form';
import Dashboard from '@/components/dashboard';
import { AvatarProvider } from '@/hooks/use-avatar';
import { logout } from '@/lib/auth';


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

function AuthWrapper() {
    const { user, isUserLoading } = useUser();
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    // Memoize the document reference
    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    
    // Use the useDoc hook to get the user profile data
    const { data: userDoc, isLoading: isUserDocLoading } = useDoc<Omit<UserInfo, 'id' | 'alias' | 'name'>>(userDocRef);

    // Main loading state that waits for both Firebase Auth and Firestore profile
    const isLoading = isUserLoading || (user && isUserDocLoading);

    useEffect(() => {
        if (isLoading) return; // Wait until everything is loaded

        if (user && userDoc) {
            if (userDoc.isSuspended) {
                toast({
                    title: "Compte Suspendu",
                    description: "Votre compte a été suspendu. Veuillez contacter le support.",
                    variant: "destructive",
                });
                logout(); // Use the central logout function
                setUserInfo(null);
                return;
            }
            
            // Set the user info state once all data is available
            setUserInfo({
                id: user.uid,
                firstName: userDoc.firstName,
                lastName: userDoc.lastName,
                name: `${userDoc.firstName} ${userDoc.lastName}`,
                email: user.email || '',
                role: userDoc.role,
                alias: userDoc.phoneNumber,
                isSuspended: userDoc.isSuspended,
            });

        } else {
             // If user is logged out or profile is missing, ensure userInfo is null
            setUserInfo(null);
            if (user && !userDoc) {
                // This can happen briefly during signup, but if it persists, it's a data integrity issue.
                console.warn("User is authenticated, but no profile document was found. This might be temporary during signup.");
            }
        }
    }, [user, userDoc, isLoading, toast]);

    const handleLogout = () => {
        logout();
        toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
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
  
    // Display a loading screen while authentication state is being determined
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Chargement...</div>;
    }
  
    // Once loading is complete, render either the authenticated view or the login form
    return (
        <main className="bg-background min-h-screen">
            {userInfo ? (
                <AppProviders userId={userInfo.id} alias={userInfo.alias}>
                   {renderDashboard()}
                </AppProviders>
            ) : (
                <CmsProvider>
                    <AuthForm />
                </CmsProvider>
            )}
        </main>
    );
}

export default function AuthenticationGate() {
    return (
        <FirebaseClientProvider>
            <AuthWrapper />
        </FirebaseClientProvider>
    );
}