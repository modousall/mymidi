
"use client";

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, Eye, EyeOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Notifications from "./notifications";
import { Progress } from './ui/progress';
import { useBalance } from '@/hooks/use-balance';
import { useVirtualCard } from '@/hooks/use-virtual-card';
import { useVaults } from '@/hooks/use-vaults';
import { useTontine } from '@/hooks/use-tontine';
import { useAvatar } from '@/hooks/use-avatar';
import { useMonthlyBudget } from '@/hooks/use-monthly-budget';
import { useTransactions } from '@/hooks/use-transactions';
import { formatCurrency } from '@/lib/utils';
import { isThisMonth, parseISO } from 'date-fns';

type UserInfo = {
    name: string;
    firstName: string;
    email: string;
};
  
type HeaderProps = { 
    userInfo: UserInfo; 
    alias: string; 
    onProfileClick: () => void;
};

export default function DashboardHeader({ userInfo, onProfileClick }: HeaderProps) {
    const { balance } = useBalance();
    const { card } = useVirtualCard();
    const { vaults } = useVaults();
    const { tontines } = useTontine();
    const { avatar } = useAvatar();
    const { budget } = useMonthlyBudget();
    const { transactions } = useTransactions();

    const [isBalanceVisible, setIsBalanceVisible] = useState(true);

    const totalVaultsBalance = vaults.reduce((acc, vault) => acc + vault.balance, 0);
    const totalTontinesBalance = tontines.reduce((acc, tontine) => acc + (tontine.amount * tontine.participants.length), 0);
    
    const totalBalance = balance + (card?.balance || 0) + totalVaultsBalance + totalTontinesBalance;
    
    const spentAmount = useMemo(() => {
        return transactions
            .filter(tx => tx.type === 'sent' && isThisMonth(parseISO(tx.date)))
            .reduce((sum, tx) => sum + tx.amount, 0);
    }, [transactions]);
    
    const monthlyBudget = budget;
    const progress = monthlyBudget > 0 ? (spentAmount / monthlyBudget) * 100 : 0;

    return (
        <header className="mb-6">
            <div className="flex justify-between items-center mb-4">
                 <button onClick={onProfileClick} className="flex items-center gap-3 text-left rounded-md p-2 -ml-2 hover:bg-secondary transition-colors">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={avatar ?? undefined} alt={userInfo.name} data-ai-hint="person face" />
                        <AvatarFallback>{(userInfo.firstName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                     <div>
                        <p className="font-bold text-lg text-foreground">{userInfo.name}</p>
                    </div>
                </button>
                 <div className="flex items-center gap-1">
                    <Notifications />
                 </div>
            </div>

            <div className="text-center cursor-pointer" onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
                <p className="text-sm text-muted-foreground">Solde Total</p>
                <div className="flex items-center justify-center gap-2">
                     {isBalanceVisible ? (
                        <p className="text-2xl font-bold tracking-tight text-primary">
                            {formatCurrency(totalBalance)}
                        </p>
                    ) : (
                        <p className="text-2xl font-bold tracking-tight text-primary">
                            ••••••••
                        </p>
                    )}
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground">
                       {isBalanceVisible ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </Button>
                </div>
            </div>

            {monthlyBudget > 0 && (
                <div className='mt-4 max-w-sm mx-auto'>
                    <div className='text-xs flex justify-between text-muted-foreground mb-1'>
                        <span>Dépenses ce mois-ci</span>
                        <span>{formatCurrency(spentAmount)} / {formatCurrency(monthlyBudget)}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

        </header>
    );
}
