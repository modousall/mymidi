
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useBalance } from "@/hooks/use-balance";
import { useVirtualCard } from "@/hooks/use-virtual-card";
import { CreditCard, Wallet, PiggyBank, HandCoins, History } from 'lucide-react';
import { useVaults } from "@/hooks/use-vaults";
import { useTontine } from "@/hooks/use-tontine";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useBnpl } from "@/hooks/use-bnpl";
import { formatCurrency } from "@/lib/utils";

type UserInfo = {
    role: 'user' | 'merchant' | 'admin' | 'superadmin' | 'support';
};

type BalanceCardsProps = {
    onNavigate: (destination: 'transactions' | 'ma-carte' | 'epargne' | 'financement') => void;
    userInfo: UserInfo;
}

export default function BalanceCards({ onNavigate, userInfo }: BalanceCardsProps) {
    const { balance } = useBalance();
    const { card } = useVirtualCard();
    const { vaults } = useVaults();
    const { tontines } = useTontine();
    const { flags } = useFeatureFlags();
    const { currentCreditBalance } = useBnpl();

    const isMerchant = userInfo.role === 'merchant';

    const totalVaultsBalance = vaults.reduce((acc, vault) => acc + vault.balance, 0);
    const totalTontinesBalance = tontines.reduce((acc, tontine) => acc + (tontine.amount * tontine.participants.length), 0);
    const totalEpargne = totalVaultsBalance + totalTontinesBalance;

    const allCards = [
        {
            id: 'transactions' as const,
            title: isMerchant ? 'Solde Marchand' : 'Solde Principal',
            balance: balance,
            icon: <Wallet className="h-5 w-5 text-white" />,
            color: 'from-primary to-blue-400',
            enabled: true,
        },
        {
            id: 'ma-carte' as const,
            title: 'Carte Virtuelle',
            balance: card?.balance ?? 0,
            icon: <CreditCard className="h-5 w-5 text-white" />,
            color: 'from-sky-500 to-cyan-400',
            enabled: flags.virtualCards && !isMerchant
        },
        {
            id: 'epargne' as const,
            title: 'Épargne',
            balance: totalEpargne,
            icon: <PiggyBank className="h-5 w-5 text-white" />,
            color: 'from-amber-500 to-yellow-400',
            enabled: !isMerchant
        },
        {
            id: 'financement' as const,
            title: 'Financement',
            balance: currentCreditBalance,
            icon: <HandCoins className="h-5 w-5 text-white" />,
            color: 'from-emerald-500 to-green-400',
            enabled: flags.bnpl && !isMerchant,
            isDebt: true,
        }
    ];

    const cardsData = allCards.filter(c => c.enabled);

    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
            {cardsData.map((c) => (
                <Card
                    key={c.id}
                    className={`text-white shadow-lg p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br ${c.color} border-none cursor-pointer hover:scale-105 transition-transform duration-200 ease-in-out`}
                    onClick={() => onNavigate(c.id)}
                >
                    <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm">{c.title}</p>
                        {c.icon}
                    </div>
                   <div className="text-right mt-2 sm:mt-4">
                        <p className="text-lg font-bold tracking-tight">
                          {c.isDebt && c.balance > 0 ? `- ${formatCurrency(c.balance)}` : formatCurrency(c.balance)}
                        </p>
                    </div>
                </Card>
            ))}
        </div>
    );
}
