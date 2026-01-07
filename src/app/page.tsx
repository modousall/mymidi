

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
import { FirebaseClientProvider, useUser, useAuth, useFirestore, createUserWithEmailAndPassword, signInWithEmailAndPassword, FirestorePermissionError, errorEmitter, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';


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
};

type AppStep = 'demo' | 'permissions' | 'login' | 'kyc' | 'alias' | 'pin_creation' | 'dashboard' | 'merchant_dashboard' | 'admin_dashboard';


// Function to ensure the superadmin exists in Firebase
const ensureSuperAdminExists = async (auth: any, firestore: any) => {
    if (!auth || !firestore) return;

    const adminEmail = 'modousall1@gmail.com';
    const adminPincode = '1234';
    const adminPassword = `${adminPincode}${adminPincode}`;
    const adminAlias = '+221775478575';

    try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        // If sign-in is successful, the user exists. We sign them out to not keep them logged in during bootstrap.
        await auth.signOut();
    } catch (error: any) {
        // If user does not exist, create them
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                const user = userCredential.user;
                const userDocRef = doc(firestore, 'users', user.uid);

                const userData = {
                    id: user.uid,
                    firstName: 'Modou',
                    lastName: 'Sall',
                    email: adminEmail,
                    phoneNumber: adminAlias,
                    alias: adminAlias,
                    role: 'superadmin',
                    isSuspended: false,
                    balance: 1000000,
                };
                
                await setDoc(userDocRef, userData).catch(e => {
                    errorEmitter.emit(
                        'permission-error',
                        new FirestorePermissionError({
                            path: userDocRef.path,
                            operation: 'create',
                            requestResourceData: userData,
                        })
                    )
                });
                
                // Sign out after creating the account to let the user log in normally
                await auth.signOut();

            } catch (creationError: any) {
                // This might happen if there's a race condition or other issue
                 errorEmitter.emit(
                    'permission-error',
                    new FirestorePermissionError({
                        path: `users/${(creationError as any)?.user?.uid || 'unknown'}`,
                        operation: 'create',
                        requestResourceData: (creationError as any).userData,
                    })
                )
            }
        }
    }
};


// A single wrapper for all providers that depend on a user alias
const AppProviders = ({ alias, children }: { alias: string, children: React.ReactNode }) => {
    return (
        <TransactionsProvider alias={alias}>
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
    const [step, setStep] = useState<AppStep>('demo');
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const { toast } = useToast();
    const auth = useAuth();
    const firestore = useFirestore();

    // Bootstrap superadmin on initial load
    useEffect(() => {
        if(auth && firestore) {
           ensureSuperAdminExists(auth, firestore);
        }
    }, [auth, firestore]);

    // Firestore hook to get user profile data
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userDoc, isLoading: isUserDocLoading } = useDoc<Omit<UserInfo, 'id' | 'alias' | 'name'> & { role: UserInfo['role'], phoneNumber: string, isSuspended: boolean }>(userDocRef);


    useEffect(() => {
        if (isUserLoading || isUserDocLoading) {
            setStep('demo'); // Show demo/loading state
            return;
        }

        if (user && userDoc) {
            if (userDoc.isSuspended) {
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
                firstName: userDoc.firstName,
                lastName: userDoc.lastName,
                name: `${userDoc.firstName} ${userDoc.lastName}`,
                email: user.email || '',
                role: userDoc.role,
                alias: userDoc.phoneNumber,
            });
            setStep(getDashboardStepForRole(userDoc.role));

        } else if (user && !userDoc) {
            // This case can happen briefly during registration.
            // If it persists, it's an error. We don't sign out immediately anymore.
            // We just wait for the userDoc to load.
        } else {
            // No user is authenticated
            setStep('demo');
            setUserInfo(null);
        }
    }, [user, userDoc, isUserLoading, isUserDocLoading, auth, toast]);

    const handleAliasCreated = (newAlias: string) => {
        sessionStorage.setItem('midi_onboarding_alias', newAlias);
        setStep('kyc');
    };

    const handleKycComplete = (info: Omit<UserInfo, 'id' | 'role' | 'alias' | 'firstName' | 'lastName' | 'name'> & {name:string}) => {
        const aliasForKyc = sessionStorage.getItem('midi_onboarding_alias');
        if (aliasForKyc) {
            const nameParts = info.name.split(' ');
            sessionStorage.setItem(`midi_onboarding_user_info`, JSON.stringify({
                alias: aliasForKyc,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
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
            let newUser;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, tempInfo.email, password);
                newUser = userCredential.user;
                
                const userDocRef = doc(firestore, 'users', newUser.uid);
                const userData = {
                    id: newUser.uid,
                    firstName: tempInfo.firstName,
                    lastName: tempInfo.lastName,
                    email: tempInfo.email,
                    phoneNumber: tempInfo.alias,
                    alias: tempInfo.alias,
                    role: 'user',
                    isSuspended: false,
                    balance: 0,
                };

                // Use blocking setDoc to ensure document is created before proceeding
                await setDoc(userDocRef, userData);

                sessionStorage.removeItem('midi_onboarding_alias');
                sessionStorage.removeItem('midi_onboarding_user_info');
                
                // The useEffect will handle the transition to the dashboard automatically
                // once the user and userDoc are available.

            } catch(error: any) {
                 toast({
                    title: "Erreur d'inscription",
                    description: error.message || "Impossible de créer le compte. L'email est peut-être déjà utilisé.",
                    variant: "destructive",
                });
                
                // If user was created in Auth but doc creation failed, delete the user
                if (newUser) {
                    await newUser.delete();
                }

                setStep('alias');
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
        if(!auth) return;
        auth.signOut();
        toast({ title: "Déconnexion", description: "Vous avez été déconnecté." });
    }

    const handleLogin = (loginIdentifier: string, secret: string) => {
        if (!firestore || !auth) return;
        
        const handleAuthError = (error: any) => {
            console.error("Firebase sign-in error:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                toast({
                    title: "Erreur de Connexion",
                    description: "L'identifiant ou le secret est incorrect.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Erreur de Connexion",
                    description: error.message || "Une erreur inconnue est survenue.",
                    variant: "destructive",
                });
            }
        };
    
        if (!loginIdentifier.includes('@')) {
            toast({
                title: "Connexion par e-mail requise",
                description: "Veuillez vous connecter en utilisant votre adresse e-mail.",
                variant: "destructive",
            });
            return;
        }

        // Always assume it's an email for login
        const password = secret.length === 4 ? `${secret}${secret}` : secret;
        signInWithEmailAndPassword(auth, loginIdentifier, password).catch(handleAuthError);
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
            );
        }

        // Public onboarding/login flow is wrapped in providers that don't need an alias
        const publicFlow = () => {
             switch (step) {
                case 'demo':
                    return <OnboardingDemo onStart={handleOnboardingStart} onLogin={handleLoginStart} />;
                case 'permissions':
                    return <PermissionsRequest onPermissionsGranted={handlePermissionsGranted} />;
                case 'alias':
                    return <AliasCreation onAliasCreated={handleAliasCreated} />;
                case 'kyc':
                    return <KYCForm onKycComplete={handleKycComplete as any} />;
                case 'pin_creation':
                    return <PinCreation onPinCreated={handlePinCreated} />;
                case 'login':
                    return <LoginForm onLogin={handleLogin} onBack={() => setStep('demo')} />;
                default:
                    return <OnboardingDemo onStart={handleOnboardingStart} onLogin={handleLoginStart} />;
            }
        }
        
        return (
            <CmsProvider>
                 {publicFlow()}
            </CmsProvider>
        )
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
