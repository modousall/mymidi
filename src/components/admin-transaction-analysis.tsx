
"use client";

import { useMemo, useState } from 'react';
import { useUserManagement, type ManagedUserWithTransactions, type Transaction } from '@/hooks/use-user-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, CartesianGrid } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useProductManagement } from '@/hooks/use-product-management';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import type { ProductWithBalance } from './admin-product-management';
import AdminProductDetail from './admin-product-detail';
import { formatCurrency } from '@/lib/utils';

export default function AdminTransactionAnalysis() {
  const { usersWithTransactions } = useUserManagement();
  const { billers, mobileMoneyOperators } = useProductManagement();
  const allProducts = useMemo(() => [...billers, ...mobileMoneyOperators], [billers, mobileMoneyOperators]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithBalance | null>(null);

  const { kpis, chartData, recentTransactions, productPerformance, allTransactions } = useMemo(() => {
    const allTxs: Transaction[] = usersWithTransactions.flatMap(u => u.transactions);
    
    const totalVolume = allTxs.reduce((acc, tx) => acc + tx.amount, 0);
    const totalTransactions = allTxs.length;
    const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
    
    // Calculate product performance and total commissions
    const productStats = new Map<string, { product: ProductWithBalance; volume: number; count: number; commissions: number }>();
    allProducts.forEach(p => {
        productStats.set(p.name, { product: p as ProductWithBalance, volume: 0, count: 0, commissions: 0 });
    });
    
    allTxs.forEach(tx => {
        // Find product associated with transaction (could be in counterparty or reason)
        const product = allProducts.find(p => tx.counterparty.includes(p.name) || tx.reason.includes(p.name));
        if (product) {
            const stats = productStats.get(product.name) ?? { product: product as ProductWithBalance, volume: 0, count: 0, commissions: 0 };
            stats.volume += tx.amount;
            stats.count += 1;
            stats.commissions += product.commission || 0;
            productStats.set(product.name, stats);
        }
    });

    const productPerformance = Array.from(productStats.values())
        .sort((a,b) => b.volume - a.volume);
        
    const totalCommissions = productPerformance.reduce((sum, p) => sum + p.commissions, 0);

    const dailyVolumes = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), i);
        const formattedDate = format(date, 'd MMM', { locale: fr });
        dailyVolumes.set(formattedDate, 0);
    }

    allTxs.forEach(tx => {
        const txDate = parseISO(tx.date);
        if (txDate > subDays(new Date(), 7)) {
            const formattedDate = format(txDate, 'd MMM', { locale: fr });
            if(dailyVolumes.has(formattedDate)) {
                dailyVolumes.set(formattedDate, dailyVolumes.get(formattedDate)! + tx.amount);
            }
        }
    });

    const chartData = Array.from(dailyVolumes.entries())
        .map(([date, total]) => ({ date, total }))
        .reverse();

    const recentTransactions = allTxs
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
        
    return {
      kpis: {
        totalVolume,
        totalTransactions,
        averageTransactionValue,
        totalCommissions,
      },
      chartData,
      recentTransactions,
      productPerformance,
      allTransactions: allTxs,
    };
  }, [usersWithTransactions, allProducts]);

  const handleExport = async () => {
    const dataToExport = allTransactions.map(tx => ({
        ID: tx.id,
        Date: tx.date,
        Type: tx.type,
        Interlocuteur: tx.counterparty,
        Raison: tx.reason,
        Montant: tx.amount,
        Statut: tx.status,
    }));
    
    const Papa = (await import('papaparse')).default;
    const csv = Papa.unparse(dataToExport, { header: true });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'export_transactions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (selectedProduct) {
      return <AdminProductDetail product={selectedProduct} allTransactions={allTransactions} onBack={() => setSelectedProduct(null)} />
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle>Centre d'Analyse des Revenus</CardTitle>
             <Button onClick={handleExport}>
                <Download className="mr-2"/> Exporter vers Excel
             </Button>
          </div>
          <CardDescription>Vue d'ensemble des métriques financières et des performances de la plateforme.</CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Volume Total Transigé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalVolume)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Commissions Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.totalCommissions)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Nombre de Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalTransactions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Valeur Moyenne / Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.averageTransactionValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volume des transactions (7 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value as number / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), "Volume"]}/>
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }}/>
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance des Produits</CardTitle>
          <CardDescription>Analyse des transactions par produit ou service. Cliquez sur une ligne pour voir les détails.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Nb. Transactions</TableHead>
                <TableHead className="text-right">Volume Total</TableHead>
                <TableHead className="text-right">Commissions Générées</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productPerformance.map(p => (
                <TableRow key={p.product.name} onClick={() => setSelectedProduct(p.product)} className="cursor-pointer">
                    <TableCell className="font-medium">{p.product.name}</TableCell>
                    <TableCell>{p.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.volume)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(p.commissions)}</TableCell>
                </TableRow>
              ))}
              {productPerformance.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center p-8">Aucune donnée de performance disponible.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Dernières Transactions Globales</CardTitle>
          <CardDescription>Les 10 transactions les plus récentes sur la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Interlocuteur</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map(tx => (
                <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.date), 'Pp', { locale: fr })}</TableCell>
                    <TableCell>
                        <Badge variant={tx.type === 'received' ? 'default' : 'secondary'} className={tx.type === 'received' ? 'bg-green-100 text-green-800' : tx.type === 'sent' ? 'bg-red-100 text-red-800' : ''}>
                            {tx.type}
                        </Badge>
                    </TableCell>
                    <TableCell>{tx.counterparty}</TableCell>
                    <TableCell>{tx.reason}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
                    <TableCell>
                        <Badge variant={tx.status === 'Terminé' ? 'default' : 'destructive'} className={tx.status === 'Terminé' ? 'bg-green-100 text-green-800' : ''}>
                            {tx.status}
                        </Badge>
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {recentTransactions.length === 0 && (
             <div className="text-center p-8">
                <p>Aucune transaction à afficher pour le moment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
