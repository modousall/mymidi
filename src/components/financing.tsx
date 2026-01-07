"use client";

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import UnifiedFinancingForm from './unified-financing-form';
import MyFinancingRequests from './my-financing-requests';
import { useBnpl } from '@/hooks/use-bnpl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useBalance } from '@/hooks/use-balance';
import { Label } from './ui/label';

type FinancingProps = {
  onBack: () => void;
};

const RepaymentSection = () => {
    const { currentCreditBalance, repayCredit } = useBnpl();
    const { balance } = useBalance();
    const { toast } = useToast();
    const [amount, setAmount] = useState<number | string>('');

    if (currentCreditBalance <= 0) return null;
    
    const handleRepay = () => {
        const repaymentAmount = Number(amount);
        if (repaymentAmount > balance) {
            toast({ title: "Solde insuffisant", description: "Votre solde principal est insuffisant.", variant: "destructive" });
            return;
        }
        if (repaymentAmount > currentCreditBalance) {
             toast({ title: "Montant excessif", description: `Vous ne pouvez pas rembourser plus que le montant dû de ${formatCurrency(currentCreditBalance)}.`, variant: "destructive" });
            return;
        }
        repayCredit(repaymentAmount);
        setAmount('');
    }

    return (
        <Card className="mb-6 bg-secondary/50">
            <CardHeader>
                <CardTitle>Rembourser mon crédit</CardTitle>
                <CardDescription>Votre solde de crédit restant est de <span className="font-bold text-primary">{formatCurrency(currentCreditBalance)}</span>.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
                <div className="flex-grow space-y-1">
                    <Label htmlFor="repay-amount" className="sr-only">Montant du remboursement</Label>
                    <Input 
                        id="repay-amount"
                        type="number" 
                        placeholder="Entrez un montant" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <Button onClick={handleRepay} disabled={!amount || Number(amount) <= 0} className="w-full sm:w-auto">
                    Rembourser
                </Button>
            </CardContent>
        </Card>
    )
}


export default function Financing({ onBack }: FinancingProps) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Demande de Financement</h2>
          <p className="text-muted-foreground">Financez vos achats et projets en quelques étapes.</p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <MyFinancingRequests isStandalone={false} />
        <RepaymentSection />
        <UnifiedFinancingForm onBack={onBack} />
      </div>
    </div>
  );
}
