
'use client';

import { useState, useEffect } from 'react';
import OnboardingDemo from '@/components/onboarding-demo';
import AliasCreation from '@/components/alias-creation';
import PermissionsRequest from '@/components/permissions-request';
import LoginForm from '@/components/login-form';
import KYCForm from '@/components/kyc-form';
import PinCreation from '@/components/pin-creation';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/dashboard';
import { AvatarProvider } from '@/hooks/use-avatar';
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
import { FirebaseClientProvider, useAuth } from '@/firebase';

const AdminDashboard = dynamic(() => import('@/components/admin-dashboard'), {
  loading: () => <div className="h-screen w-full flex items-center justify-center"><Skeleton className="h-24 w-1/3" /></div>,
  ssr: false,
});
const MerchantDashboard = dynamic(() => import('@/components/merchant-dashboard'), {
  loading: () => <div className="h-screen w-full flex items-center justify-center"><Skeleton className="h-24 w-1/3" /></div>,
  ssr: false,
});


type UserInfo = {
  name: string;
  email: string;
  role: 'user' | 'merchant' | 'admin' | 'superadmin' | 'support' | 'agent';
};

type AppStep = 'demo' | 'permissions' | 'login' | 'kyc' | 'alias' | 'pin_creation' | 'dashboard' | 'merchant_dashboard' | 'admin_dashboard';

// Function to ensure the superadmin exists in localStorage
const ensureSuperAdminExists = () => {
    const adminAlias = '+221775478575';
    const adminUserKey = `midi_user_${adminAlias}`;

    if (typeof window !== 'undefined' && !localStorage.getItem(adminUserKey)) {
        const adminUser = {
            name: 'Modou Sall',
            email: 'modousall1@gmail.com',
            pincode: '1234',
            role: 'superadmin',
        };
        localStorage.setItem(adminUserKey, JSON.stringify(adminUser));
        // Also set a default balance for the superadmin
        localStorage.setItem(`midi_balance_${adminAlias}`, '1000000');
    }
};

const ProductProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  // This is a bit of a hack since we can't easily get the admin's addTransaction function here.
  // In a real app, this would be handled differently, likely via a centralized API service.
  // For the demo, we'll log a warning.
  const handleSettlement = (tx: any) => {
      console.warn("Settlement transaction from ProductProvider:", tx);
  }
  return (
    <ProductProvider addSettlementTransaction={handleSettlement}>
      {children}
    </ProductProvider>
  )
}

// A single wrapper for all providers
const AppProviders = ({ alias, children }: { alias: string, children: React.ReactNode }) => {
    return (
        <FirebaseClientProvider>
            <TransactionsProvider alias={alias}>
                <TreasuryProvider>
                    <CmsProvider>
                        <ProductProviderWrapper>
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
                        </ProductProviderWrapper>
                    </CmsProvider>
                </TreasuryProvider>
            </TransactionsProvider>
        </FirebaseClientProvider>
    )
}

const getDashboardStepForRole = (role: UserInfo['role']): AppStep => {
    switch (role) {
        case 'merchant':
            return 'merchant_dashboard';
        case 'admin':
        case 'superadmin':
        case 'support':
             return 'admin_dashboard';
        case 'user':
        default:
            return 'dashboard';
    }
};

export default function AuthenticationGate() {
  const [step, setStep] = useState<AppStep>('demo');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [alias, setAlias] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    ensureSuperAdminExists();

    const lastAlias = localStorage.getItem('midi_last_alias');
    if (lastAlias) {
        const userDataString = localStorage.getItem(`midi_user_${lastAlias}`);
        if(userDataString) {
            const userData = JSON.parse(userDataString);
            if(userData.isSuspended){
                toast({
                    title: "Compte Suspendu",
                    description: "Votre compte a été suspendu. Veuillez contacter le support.",
                    variant: "destructive",
                });
                localStorage.removeItem('midi_last_alias');
                setStep('demo');
                return;
            }
            const userRole = userData.role || 'user';
            setUserInfo({ name: userData.name, email: userData.email, role: userRole });
            setAlias(lastAlias);
            setStep(getDashboardStepForRole(userRole));
            
        } else {
             // Data mismatch, clear and go to demo
             localStorage.removeItem('midi_last_alias');
             setStep('demo');
        }
    }
  }, [toast]);

  const handleAliasCreated = (newAlias: string) => {
    localStorage.setItem('midi_active_alias_creation', newAlias);
    setStep('kyc');
  };

  const handleKycComplete = (info: Omit<UserInfo, 'role'>) => {
    const aliasForKyc = localStorage.getItem('midi_active_alias_creation');
    if (aliasForKyc) {
        // We only store the basic info temporarily.
        // Full user object with PIN is created at the final step.
        localStorage.setItem(`midi_temp_user_info`, JSON.stringify({
            alias: aliasForKyc,
            name: info.name,
            email: info.email,
        }));
        setStep('pin_creation');
    } else {
        toast({
            title: "Erreur critique",
            description: "L'alias de l'utilisateur est manquant. Retour à l'accueil.",
            variant: "destructive",
        });
        setStep('demo');
    }
  };
  
  const handlePinCreated = (pin: string) => {
    const tempUserInfoString = localStorage.getItem('midi_temp_user_info');
    
    if (tempUserInfoString) {
        const tempInfo = JSON.parse(tempUserInfoString);
        const aliasForPin = tempInfo.alias;

        const newUser = {
            name: tempInfo.name,
            email: tempInfo.email,
            pincode: pin,
            role: 'user',
        };

        localStorage.setItem(`midi_user_${aliasForPin}`, JSON.stringify(newUser));
        localStorage.setItem(`midi_onboarded_${aliasForPin}`, 'true');
        localStorage.setItem(`midi_balance_${aliasForPin}`, '0');
        localStorage.setItem('midi_last_alias', aliasForPin);

        // Clean up temporary keys
        localStorage.removeItem('midi_active_alias_creation');
        localStorage.removeItem('midi_temp_user_info');
        
        // Set the state for the new logged-in user
        setAlias(aliasForPin);
        setUserInfo({ name: newUser.name, email: newUser.email, role: 'user' });
        setStep('dashboard');

        toast({
            title: "Compte créé avec succès !",
            description: "Bienvenue sur Midi. Votre compte est maintenant prêt.",
        });

    } else {
         toast({
            title: "Erreur critique d'inscription",
            description: "Les informations de l'utilisateur sont introuvables. Veuillez réessayer.",
            variant: "destructive",
        });
        setStep('demo');
    }
  }
  
  const handleOnboardingStart = () => {
    setStep('permissions');
  };

  const handlePermissionsGranted = () => {
    setStep('alias');
  };

  const handleLoginStart = () => {
    setStep('login');
  };
  
  const handleLogout = () => {
    localStorage.removeItem('midi_last_alias');
    setAlias(null);
    setUserInfo(null);
    setStep('demo');
    toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès.",
    });
  }

  const handleLogin = (loginAlias: string, pin: string) => {
    const userDataString = localStorage.getItem(`midi_user_${loginAlias}`);
  
    if (userDataString) {
        const userData = JSON.parse(userDataString);

        if (userData.isSuspended) {
            toast({
                title: "Compte Suspendu",
                description: "Votre compte a été suspendu par un administrateur. Veuillez contacter le support.",
                variant: "destructive",
            });
            return;
        }

        if (userData.pincode === pin) {
            localStorage.setItem('midi_last_alias', loginAlias);
            const userRole = userData.role || 'user';
            setUserInfo({ name: userData.name, email: userData.email, role: userRole });
            setAlias(loginAlias);
            toast({
              title: `Bienvenue, ${userData.name} !`,
              description: "Connexion réussie.",
            });
            setStep(getDashboardStepForRole(userRole));
        } else {
             toast({
                title: "Code PIN incorrect",
                description: "Le code PIN que vous avez saisi est incorrect. Veuillez réessayer.",
                variant: "destructive",
            });
        }
    } else {
      toast({
        title: "Alias non trouvé",
        description: "Cet alias n'existe pas. Veuillez vérifier l'alias ou créer un nouveau compte.",
        variant: "destructive",
      });
    }
  }
  
  const renderContent = () => {
    if (alias && userInfo) {
        // If a user is logged in, wrap the appropriate dashboard with all necessary providers
        return (
            <AppProviders alias={alias}>
                {step === 'dashboard' && <Dashboard alias={alias} userInfo={userInfo} onLogout={handleLogout} />}
                {step === 'merchant_dashboard' && <MerchantDashboard userInfo={userInfo} alias={alias} onLogout={handleLogout} />}
                {step === 'admin_dashboard' && <AdminDashboard onExit={handleLogout} />}
            </AppProviders>
        )
    }

    // If no user is logged in, show the public onboarding/login flow
    switch (step) {
      case 'demo':
        return <CmsProvider><OnboardingDemo onStart={handleOnboardingStart} onLogin={handleLoginStart} /></CmsProvider>;
      case 'permissions':
        return <PermissionsRequest onPermissionsGranted={handlePermissionsGranted} />;
      case 'alias':
        return <AliasCreation onAliasCreated={handleAliasCreated} />;
      case 'kyc':
        return <KYCForm onKycComplete={handleKycComplete} />;
      case 'pin_creation':
        return <PinCreation onPinCreated={handlePinCreated} />;
      case 'login':
        return <LoginForm onLogin={handleLogin} onBack={() => setStep('demo')} />;
      default:
         // Fallback for any state inconsistency
        localStorage.removeItem('midi_last_alias');
        localStorage.removeItem('midi_active_alias_creation');
        localStorage.removeItem('midi_temp_user_info');
        return <CmsProvider><OnboardingDemo onStart={handleOnboardingStart} onLogin={handleLoginStart} /></CmsProvider>;
    }
  };
  
  if (!isClient) {
    return <div className="flex h-screen items-center justify-center">Chargement...</div>;
  }

  return <main className="bg-background min-h-screen">{renderContent()}</main>;
}
