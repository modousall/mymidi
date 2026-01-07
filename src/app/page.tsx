
'use client';

import { useState, useEffect } from 'react';
import OnboardingDemo from '@/components/onboarding-demo';
import AliasCreation from '@/components/alias-creation';
import PermissionsRequest from '@/components/permissions-request';
import LoginForm from '@/components/login-form';
import KYCForm from '@/components/kyc-form';
import PinCreation from '@/components/pin-creation';
import { useToast } from '@/hooks/use-toast';
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
import { FirebaseClientProvider, useUser, useAuth, useFirestore, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';


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
  email: string;
  role: 'user' | 'merchant' | 'admin' | 'superadmin' | 'support' | 'agent';
  alias: string;
};

type AppStep = 'demo' | 'permissions' | 'login' | 'kyc' | 'alias' | 'pin_creation' | 'dashboard' | 'merchant_dashboard' | 'admin_dashboard';


// Function to ensure the superadmin exists in Firebase
const ensureSuperAdminExists = async (auth: any, firestore: any) => {
    if (!auth || !firestore) return;

    const adminEmail = 'modousall1@gmail.com';
    const adminPincode = '1234';
    const adminPassword = `${adminPincode}${adminPincode}`;
    const adminAlias = '+221775478575';

    // We can't directly check if a user exists by email on the client-side without signing in.
    // A common workaround for bootstrap is to try signing in, and if it fails with 'user-not-found', create the user.
    try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        // If sign-in succeeds, user exists. Sign them out to not affect the main auth flow.
        await auth.signOut();
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                // User doesn't exist, so create them.
                const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                const user = userCredential.user;

                // Now create the user document in Firestore
                const userDocRef = doc(firestore, 'users', user.uid);
                await setDoc(userDocRef, {
                    id: user.uid,
                    firstName: 'Modou',
                    lastName: 'Sall',
                    email: adminEmail,
                    phoneNumber: adminAlias,
                    alias: adminAlias,
                    role: 'superadmin',
                    isSuspended: false,
                    balance: 1000000,
                });
                console.log("Superadmin account created in Firebase Auth and Firestore.");
                 // Also sign out after creation to let the user log in manually
                await auth.signOut();
            } catch (creationError) {
                console.error("Failed to create superadmin:", creationError);
            }
        }
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

function AuthWrapper() {
    const { user, isUserLoading } = useUser();
    const [step, setStep] = useState<AppStep>(isUserLoading ? 'demo' : 'login'); // Start at demo/login
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const { toast } = useToast();
    const auth = useAuth();
    const firestore = useFirestore();

    useEffect(() => {
        if(auth && firestore) {
           ensureSuperAdminExists(auth, firestore);
        }
    }, [auth, firestore]);


    useEffect(() => {
        if (isUserLoading) {
            setStep('demo'); // Show demo while checking auth state
            return;
        }

        if (user) {
            const userDocRef = doc(firestore, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const userData = docSnap.data() as Omit<UserInfo, 'id' | 'alias'> & { role: UserInfo['role'], phoneNumber: string, isSuspended: boolean };
                    if(userData.isSuspended){
                        toast({
                            title: "Compte Suspendu",
                            description: "Votre compte a été suspendu. Veuillez contacter le support.",
                            variant: "destructive",
                        });
                        auth.signOut();
                        setStep('login');
                        setUserInfo(null);
                        return;
                    }

                    setUserInfo({
                        id: user.uid,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: user.email || '',
                        role: userData.role,
                        alias: userData.phoneNumber,
                    });
                    setStep(getDashboardStepForRole(userData.role));
                } else {
                    // This case can happen if user exists in Firebase Auth but not in our DB.
                    // For this prototype, we'll log out the user.
                    console.error("User document not found in Firestore for authenticated user.");
                    auth.signOut();
                    setStep('login');
                    setUserInfo(null);
                }
            });
        } else {
            // No user is signed in
            setStep('demo');
            setUserInfo(null);
        }
    }, [user, isUserLoading, auth, firestore, toast]);

    const handleAliasCreated = (newAlias: string) => {
        // Store temporarily for the next steps of onboarding
        sessionStorage.setItem('midi_onboarding_alias', newAlias);
        setStep('kyc');
    };

    const handleKycComplete = (info: Omit<UserInfo, 'id' | 'role' | 'alias'>) => {
        const aliasForKyc = sessionStorage.getItem('midi_onboarding_alias');
        if (aliasForKyc) {
            sessionStorage.setItem(`midi_onboarding_user_info`, JSON.stringify({
                alias: aliasForKyc,
                firstName: info.firstName,
                lastName: info.lastName,
                email: info.email,
            }));
            setStep('pin_creation');
        } else {
            toast({ title: "Erreur critique", description: "L'alias de l'utilisateur est manquant.", variant: "destructive" });
            setStep('demo');
        }
    };
  
    const handlePinCreated = async (pin: string) => {
        const tempUserInfoString = sessionStorage.getItem('midi_onboarding_user_info');
        
        if (tempUserInfoString && auth && firestore) {
            const tempInfo = JSON.parse(tempUserInfoString);
            const password = `${pin}${pin}`;

            try {
                // Create user in Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, tempInfo.email, password);
                const newUser = userCredential.user;
                
                // Create user document in Firestore
                const userDocRef = doc(firestore, 'users', newUser.uid);
                await setDoc(userDocRef, {
                    id: newUser.uid,
                    firstName: tempInfo.firstName,
                    lastName: tempInfo.lastName,
                    email: tempInfo.email,
                    phoneNumber: tempInfo.alias,
                    alias: tempInfo.alias, // Using phone number as alias for login
                    role: 'user',
                    isSuspended: false,
                    balance: 0,
                });

                // Clean up
                sessionStorage.removeItem('midi_onboarding_alias');
                sessionStorage.removeItem('midi_onboarding_user_info');
                
                // The useEffect will handle setting the user state from the new auth state
                toast({ title: "Compte créé avec succès !", description: "Bienvenue sur Midi." });

            } catch(error: any) {
                 toast({
                    title: "Erreur d'inscription",
                    description: error.message || "Impossible de créer le compte. L'email est peut-être déjà utilisé.",
                    variant: "destructive",
                });
                setStep('alias'); // Go back to alias creation
            }
        } else {
            toast({ title: "Erreur critique d'inscription", variant: "destructive" });
            setStep('demo');
        }
    }
  
    const handleOnboardingStart = () => setStep('permissions');
    const handlePermissionsGranted = () => setStep('alias');
    const handleLoginStart = () => setStep('login');
  
    const handleLogout = () => {
        auth.signOut();
        toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
    }

    const handleLogin = (loginAlias: string, pin: string) => {
        if (!firestore) return;
        const password = `${pin}${pin}`;
        
        // Query firestore for a user with the matching alias (phoneNumber)
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where("phoneNumber", "==", loginAlias));

        getDocs(q).then(querySnapshot => {
            if (querySnapshot.empty) {
                toast({ title: "Alias non trouvé", variant: "destructive" });
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.isSuspended) {
                toast({ title: "Compte Suspendu", variant: "destructive" });
                return;
            }

            // We don't check pincode here anymore, we let Firebase Auth do it.
            signInWithEmailAndPassword(auth, userData.email, password)
                .then((userCredential) => {
                    // Login successful, the useEffect hook will handle the rest.
                    toast({ title: `Bienvenue, ${userData.firstName} !` });
                })
                .catch((error) => {
                    console.error("Firebase sign-in error:", error);
                    toast({
                        title: "Erreur de Connexion Firebase",
                        description: "Impossible de se connecter. Veuillez réessayer.",
                        variant: "destructive",
                    });
                });
        }).catch(error => {
             console.error("Error fetching user for login:", error);
             toast({ title: "Erreur de base de données", variant: "destructive" });
        });
    }
  
    const renderContent = () => {
        if (isUserLoading || (user && !userInfo)) {
            return <div className="flex h-screen items-center justify-center">Chargement...</div>;
        }

        if (userInfo && user) {
            return (
                <AppProviders alias={userInfo.alias}>
                    {step === 'dashboard' && <Dashboard alias={userInfo.alias} userInfo={userInfo} onLogout={handleLogout} />}
                    {step === 'merchant_dashboard' && <MerchantDashboard userInfo={userInfo} alias={userInfo.alias} onLogout={handleLogout} />}
                    {step === 'admin_dashboard' && <AdminDashboard onExit={handleLogout} />}
                </AppProviders>
            )
        }

        // Public onboarding/login flow
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
                return <CmsProvider><OnboardingDemo onStart={handleOnboardingStart} onLogin={handleLoginStart} /></CmsProvider>;
        }
    };
  
    return <main className="bg-background min-h-screen">{renderContent()}</main>;
}

export default function AuthenticationGate() {
    return (
        <FirebaseClientProvider>
            <AuthWrapper />
        </FirebaseClientProvider>
    );
}
