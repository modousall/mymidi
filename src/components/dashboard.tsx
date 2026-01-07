
"use client";

import { useState } from 'react';
import TransactionHistory from './transaction-history';
import Profile from './profile';
import VirtualCard from './virtual-card';
import HomeActions from './home-actions';
import BalanceCards from './balance-cards';
import DashboardHeader from './dashboard-header';
import PayerTransferer from './payer-transferer';
import RechargerCompte from './recharger-compte';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import Settings from './settings';
import MerchantList from './merchant-list';
import Financing from './financing';
import Epargne from './epargne';
import WithdrawOptions from './withdraw-options';
import Paiement from './paiement';
import { TransactionsProvider } from '@/hooks/use-transactions';


type UserInfo = {
    name: string;
    firstName: string;
    email: string;
    role: 'user' | 'merchant' | 'admin' | 'superadmin' | 'support';
};

type DashboardProps = {
  alias: string;
  userInfo: UserInfo;
  onLogout: () => void;
};

type View = 'dashboard' | 'profile' | 'settings' | 'merchants';
type ActiveAction = 'none' | 'transferer' | 'recharger' | 'retirer' | 'paiement';
type ActiveService = 'ma-carte' | 'epargne' | 'financement' | null;

export default function Dashboard({ alias, userInfo, onLogout }: DashboardProps) {
    const [view, setView] = useState<View>('dashboard');
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [activeService, setActiveService] = useState<ActiveService>(null);
    const [activeAction, setActiveAction] = useState<ActiveAction>('none');
    const { flags } = useFeatureFlags();

    const handleShowAllTransactions = (show: boolean) => {
        setShowAllTransactions(show);
    };
    
    const onNavigateTo = (newView: View) => {
        setShowAllTransactions(false);
        setActiveService(null);
        setActiveAction('none');
        setView(newView);
    }
    
    const handleCardNavigation = (destination: 'transactions' | ActiveService) => {
        if (destination === 'transactions') {
            setShowAllTransactions(true);
            setView('dashboard'); 
            setActiveService(null);
            setActiveAction('none');
        } else {
            setActiveService(destination as ActiveService);
            setView('dashboard');
            setActiveAction('none');
        }
    };
    
    const renderContent = () => {
        if(view === 'profile'){
            return <Profile userInfo={userInfo} alias={alias} onLogout={onLogout} onBack={() => onNavigateTo('dashboard')} onNavigate={onNavigateTo} />;
        }
        if (view === 'settings') {
            return <Settings alias={alias} onBack={() => onNavigateTo('profile')} onLogout={onLogout} onNavigate={onNavigateTo} />;
        }
        if (view === 'merchants') {
            return <MerchantList onBack={() => onNavigateTo('settings')} />;
        }

        // From this point on, all views need the transaction provider context
        return (
            <TransactionsProvider alias={alias}>
                {(() => {
                    if (showAllTransactions) {
                        return <TransactionHistory showAll={true} onShowAll={handleShowAllTransactions} />;
                    }
                    if (activeService) {
                         switch (activeService) {
                            case 'ma-carte':
                                return <VirtualCard onBack={() => setActiveService(null)} cardHolderName={userInfo.name} />;
                            case 'epargne':
                                 return <Epargne onBack={() => setActiveService(null)} />;
                            case 'financement':
                                return <Financing onBack={() => setActiveService(null)} />;
                            default:
                                setActiveService(null);
                         }
                    }
                    if (activeAction !== 'none') {
                         switch (activeAction) {
                            case 'transferer':
                                return <PayerTransferer onBack={() => setActiveAction('none')} />
                            case 'recharger':
                                return <RechargerCompte onBack={() => setActiveAction('none')} />
                            case 'retirer':
                                return <WithdrawOptions onBack={() => setActiveAction('none')} alias={alias} userInfo={userInfo} />
                            case 'paiement':
                                return <Paiement onBack={() => setActiveAction('none')} />
                            default:
                                setActiveAction('none');
                        }
                    }
                    
                    return (
                        <div className="space-y-8">
                            <DashboardHeader userInfo={userInfo} alias={alias} onProfileClick={() => onNavigateTo('profile')} />
                            
                            <HomeActions 
                                onSendClick={() => setActiveAction('transferer')} 
                                onRechargeClick={() => setActiveAction('recharger')}
                                onWithdrawClick={() => setActiveAction('retirer')}
                                onBillPayClick={() => setActiveAction('paiement')}
                                onFinancingClick={() => setActiveService('financement')}
                                alias={alias}
                                userInfo={userInfo}
                            />
                            
                            <BalanceCards onNavigate={handleCardNavigation} userInfo={userInfo} />
                            <TransactionHistory showAll={false} onShowAll={handleShowAllTransactions} />
                        </div>
                    )
                })()}
            </TransactionsProvider>
        )
      }

  return (
    <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-grow container mx-auto p-4 sm:p-6">
            {renderContent()}
        </main>
    </div>
  );
}
