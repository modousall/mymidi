
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Loader2, Copy, QrCode, ScanLine, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useUserManagement, type ManagedUser } from '@/hooks/use-user-management';
import QrCodeDisplay from './qr-code-display';
import dynamic from 'next/dynamic';
import { Skeleton } from './ui/skeleton';

const QRCodeScanner = dynamic(() => import('./qr-code-scanner'), {
  loading: () => <div className="flex items-center justify-center h-48"><Skeleton className="h-32 w-32" /></div>,
  ssr: false,
});

const picashFormSchema = z.object({
  amount: z.coerce.number().positive({ message: "Le montant du retrait doit être positif." }),
});

type PicashFormValues = z.infer<typeof picashFormSchema>;

type UserInfo = { name: string; email: string; };

type PicashProps = {
  onBack: () => void;
  userInfo: UserInfo;
};

export default function PICASH({ onBack, userInfo }: PicashProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [operationDetails, setOperationDetails] = useState<{amount: number, client: ManagedUser} | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedClient, setScannedClient] = useState<ManagedUser | null>(null);
  const { toast } = useToast();
  const { users } = useUserManagement();
  

  const form = useForm<PicashFormValues>({
    resolver: zodResolver(picashFormSchema),
    defaultValues: {
      amount: '' as any,
    },
  });

  const handleWithdrawalForClient = (values: PicashFormValues) => {
    if (!scannedClient) {
        toast({ title: "Client non trouvé", description: "Veuillez scanner le QR code du client.", variant: "destructive" });
        return;
    }
    
    const clientFromDb = users.find(u => u.alias === scannedClient.alias);
    if (!clientFromDb || values.amount > clientFromDb.balance) {
        toast({ title: "Solde client insuffisant", description: "Le solde du client est insuffisant pour ce retrait.", variant: "destructive" });
        return;
    }

    // Simulate multi-account transaction by directly manipulating localStorage
    const merchantAlias = userInfo.name; // Using name as alias for display
    
    // 1. Debit the client
    const clientBalanceKey = `midi_balance_${scannedClient.alias}`;
    const clientNewBalance = clientFromDb.balance - values.amount;
    localStorage.setItem(clientBalanceKey, JSON.stringify(clientNewBalance));
    
    // 2. Add transaction to client's history
    const clientTxKey = `midi_transactions_${scannedClient.alias}`;
    const clientTxs = JSON.parse(localStorage.getItem(clientTxKey) || '[]');
    const clientNewTx = {
        id: `TXN${Date.now()}`, type: 'sent', counterparty: `Retrait chez ${merchantAlias}`,
        reason: 'Retrait d\'argent', amount: values.amount, date: new Date().toISOString(), status: 'Terminé'
    };
    localStorage.setItem(clientTxKey, JSON.stringify([clientNewTx, ...clientTxs]));
    
    // 3. Credit the merchant
    const merchantBalanceKey = `midi_balance_${merchantAlias}`;
    const merchantCurrentBalance = JSON.parse(localStorage.getItem(merchantBalanceKey) || '0');
    const newMerchantBalance = merchantCurrentBalance + values.amount;
    localStorage.setItem(merchantBalanceKey, JSON.stringify(newMerchantBalance));

    // 4. Add transaction to merchant's history
    const merchantTxKey = `midi_transactions_${merchantAlias}`;
    const merchantTxs = JSON.parse(localStorage.getItem(merchantTxKey) || '[]');
    const merchantNewTx = {
      id: `TXN${Date.now()+1}`, type: "received", counterparty: `Retrait pour ${scannedClient.name}`,
      reason: `Service de retrait cash`, amount: values.amount,
      date: new Date().toISOString(), status: 'Terminé'
    };
    localStorage.setItem(merchantTxKey, JSON.stringify([merchantNewTx, ...merchantTxs]));

    setOperationDetails({ amount: values.amount, client: scannedClient });
    toast({ title: 'Opération réussie', description: `Vous avez été crédité de ${formatCurrency(values.amount)}.` });
  }

  const onSubmit = (values: PicashFormValues) => {
    setIsLoading(true);
    setTimeout(() => {
        handleWithdrawalForClient(values);
        setIsLoading(false);
    }, 1500);
  };
  
  const resetForm = () => {
    setOperationDetails(null);
    setScannedClient(null);
    form.reset();
  }
  
  const handleScannedCode = (decodedText: string) => {
     try {
        const data = JSON.parse(decodedText);
        const client = users.find(u => u.alias === data.shid);
        if (client) {
            setScannedClient(client);
            toast({ title: "Client Identifié", description: `${client.name} a été sélectionné pour le retrait.`});
        } else {
            toast({ title: "Erreur", description: "Ce QR code ne correspond à aucun client.", variant: "destructive"});
        }
    } catch(e) {
        toast({ title: "QR Code Invalide", variant: "destructive"});
    }
    setIsScannerOpen(false);
  }

  if (operationDetails) {
    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Button onClick={resetForm} variant="ghost" size="icon">
                    <ArrowLeft />
                </Button>
                <h2 className="text-2xl font-bold text-primary">Opération Réussie</h2>
            </div>
            <Card className="max-w-sm mx-auto text-center">
                <CardHeader>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4"/>
                    <CardTitle>Retrait pour {operationDetails.client.name} terminé</CardTitle>
                    <CardDescription>
                        Vous avez remis {formatCurrency(operationDetails.amount)} au client. Votre solde a été crédité.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={resetForm} className="w-full">Nouvelle Opération</Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Retrait Client</h2>
          <p className="text-muted-foreground">Scannez le QR code de votre client et entrez le montant pour effectuer un retrait.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg mx-auto">
            <FormItem>
                <FormLabel>Client à débiter</FormLabel>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        {scannedClient ? (
                            <QrCodeDisplay alias={scannedClient.alias} userInfo={scannedClient} simpleMode={true} />
                        ) : (
                             <div className="h-[100px] w-[100px] bg-muted rounded-md flex items-center justify-center">
                                <QrCode className="h-10 w-10 text-muted-foreground" />
                            </div>
                        )}
                        <div className="flex-grow space-y-1">
                            {scannedClient ? (
                                <>
                                    <p className="font-bold">{scannedClient.name}</p>
                                    <p className="text-sm text-muted-foreground">{scannedClient.alias}</p>
                                    <p className="text-sm font-semibold">Solde: {formatCurrency(scannedClient.balance)}</p>
                                </>
                            ) : (
                                <p className="text-muted-foreground">En attente du scan...</p>
                            )}
                        </div>
                        <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="outline"><ScanLine className="mr-2" />Scanner le client</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md p-0">
                                <DialogHeader className="p-4"><DialogTitle>Scanner le QR code du client</DialogTitle></DialogHeader>
                                <QRCodeScanner onScan={handleScannedCode}/>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </FormItem>

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant du retrait</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="ex: 20000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full py-6" disabled={isLoading || !scannedClient}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Effectuer le retrait pour le client
          </Button>
        </form>
      </Form>
    </div>
  );
}
