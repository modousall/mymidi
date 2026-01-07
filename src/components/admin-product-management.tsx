
"use client";

import { useState, useMemo } from 'react';
import { useProductManagement, type ProductItem } from '@/hooks/use-product-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Edit, PlusCircle, Power, PowerOff, Landmark, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './ui/dialog';
import { Switch } from './ui/switch';
import { toast } from '@/hooks/use-toast';
import AdminProductDetail from './admin-product-detail';
import { formatCurrency } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, collectionGroup } from 'firebase/firestore';
import type { Transaction } from '@/hooks/use-transactions';

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom est requis."),
  fee: z.coerce.number().min(0, "Les frais ne peuvent être négatifs.").default(0),
  commission: z.coerce.number().min(0, "La commission ne peut être négative.").default(0),
  isActive: z.boolean().default(true),
});
type ProductFormValues = z.infer<typeof productSchema>;

export type ProductWithBalance = ProductItem & { balance: number };

const SettlementDialog = ({ product, onSettle }: { product: ProductWithBalance, onSettle: (id: string, amount: number) => void}) => {
    const [settlementAmount, setSettlementAmount] = useState(product.balance);

    const handleSettle = () => {
        onSettle(product.id, settlementAmount);
    }
    
    return (
         <DialogContent>
            <DialogHeader>
                <DialogTitle>Règlement pour {product.name}</DialogTitle>
                <DialogDescription>
                    Confirmez le montant à régler pour ce facturier. Cette action simulera un virement et réinitialisera le solde dû.
                </DialogDescription>
            </DialogHeader>
             <div className="py-4 space-y-4">
                 <div className="p-4 rounded-lg bg-secondary">
                    <p className="text-sm text-muted-foreground">Solde actuel dû</p>
                    <p className="text-2xl font-bold">{formatCurrency(product.balance)}</p>
                </div>
                <FormItem>
                    <FormLabel>Montant du règlement</FormLabel>
                    <Input 
                        type="number" 
                        value={settlementAmount} 
                        onChange={(e) => setSettlementAmount(Number(e.target.value))}
                    />
                </FormItem>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
                <DialogClose asChild><Button onClick={handleSettle}><Landmark className="mr-2"/> Confirmer le règlement</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    )
}


const ProductDialog = ({ 
    product, 
    onSave, 
    onClose 
}: { 
    product: Partial<ProductItem> | null, 
    onSave: (data: ProductFormValues) => void,
    onClose: () => void 
}) => {
    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: { 
            id: product?.id, 
            name: product?.name || "", 
            fee: product?.fee ?? 0,
            commission: product?.commission ?? 0,
            isActive: product?.isActive === undefined ? true : product.isActive,
        },
    });

    const onSubmit = (values: ProductFormValues) => {
        onSave(values);
        onClose();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{product?.id ? 'Modifier' : 'Ajouter'} un facturier</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nom du facturier</FormLabel><FormControl><Input placeholder="ex: SENELEC" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="fee" render={({ field }) => (
                            <FormItem><FormLabel>Frais client</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="commission" render={({ field }) => (
                            <FormItem><FormLabel>Commission Midi</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                     <FormField control={form.control} name="isActive" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5"><FormLabel>Statut</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>

                    <DialogFooter className="pt-4">
                         <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
                         <Button type="submit">{product?.id ? 'Sauvegarder' : 'Ajouter'}</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
};


const ProductTable = ({ 
    title, 
    products, 
    onAdd,
    onUpdate,
    onDelete,
    onSettle,
    onRowClick
}: { 
    title: string, 
    products: ProductWithBalance[], 
    onAdd: (data: ProductFormValues) => void, 
    onUpdate: (data: ProductFormValues) => void,
    onDelete: (id: string) => void,
    onSettle: (id: string, amount: number) => void,
    onRowClick: (product: ProductWithBalance) => void
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<ProductItem> | null>(null);

    const openDialog = (product: Partial<ProductItem> | null = null) => {
        setEditingProduct(product);
        setIsDialogOpen(true);
    };
    
    const closeDialog = () => {
        setEditingProduct(null);
        setIsDialogOpen(false);
    }
    
    const handleSave = (data: ProductFormValues) => {
        if(data.id) {
            onUpdate(data);
        } else {
            onAdd(data);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                    <Button onClick={() => openDialog()}>
                        <PlusCircle className="mr-2"/> Ajouter
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Statut</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>Frais Client</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Solde à régler</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map(p => (
                            <TableRow key={p.id} onClick={() => onRowClick(p)} className="cursor-pointer">
                                <TableCell>
                                    <Badge variant={p.isActive ? 'default' : 'secondary'} className={p.isActive ? 'bg-green-100 text-green-800' : ''}>
                                        {p.isActive ? <Power size={14} className="mr-1"/> : <PowerOff size={14} className="mr-1"/>}
                                        {p.isActive ? 'Actif' : 'Inactif'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>{formatCurrency(p.fee)}</TableCell>
                                <TableCell>{formatCurrency(p.commission)}</TableCell>
                                <TableCell>
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="link" className="p-0 h-auto text-base" disabled={(p.balance || 0) <= 0} onClick={(e) => e.stopPropagation()}>
                                                {formatCurrency(p.balance)}
                                            </Button>
                                        </DialogTrigger>
                                        <SettlementDialog product={p} onSettle={onSettle}/>
                                     </Dialog>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); openDialog(p);}}><Edit size={16}/></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => {e.stopPropagation(); onDelete(p.id);}}><Trash2 size={16}/></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                         {products.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-center">Aucun facturier configuré.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  {<ProductDialog product={editingProduct} onSave={handleSave} onClose={closeDialog} />}
                </Dialog>
            </CardContent>
        </Card>
    )
}

export default function AdminProductManagement({ onBack }: { onBack: () => void }) {
  const { 
      billers, addBiller, removeBiller, updateBiller, settleBiller,
      mobileMoneyOperators, addMobileMoneyOperator, removeMobileMoneyOperator, updateMobileMoneyOperator, settleMobileMoneyOperator
  } = useProductManagement();
  
  const [selectedProduct, setSelectedProduct] = useState<ProductWithBalance | null>(null);

  const firestore = useFirestore();
  const transactionsQuery = useMemoFirebase(() => query(collectionGroup(firestore, 'transactions')), [firestore]);
  const { data: allTransactions } = useCollection<Transaction>(transactionsQuery);

  const productsWithBalance = useMemo(() => {
    const allProducts = [...billers, ...mobileMoneyOperators];
    
    return allProducts.map(product => {
        const productTransactions = allTransactions?.filter(tx => 
            tx.reason.includes(product.name) || tx.counterparty.includes(product.name)
        ) || [];

        const creditTransactions = productTransactions.filter(tx => tx.type === 'sent');
        const balance = creditTransactions.reduce((acc, tx) => acc + tx.amount, 0);
        
        const settlementTransactions = productTransactions.filter(tx => tx.type === 'versement');
        const totalSettled = settlementTransactions.reduce((acc, tx) => acc + tx.amount, 0);

        return {
            ...product,
            balance: balance - totalSettled,
        };
    });
  }, [billers, mobileMoneyOperators, allTransactions]);

  const billersWithBalance = useMemo(() => {
      return productsWithBalance.filter(p => billers.some(b => b.id === p.id));
  }, [productsWithBalance, billers]);
  
  const operatorsWithBalance = useMemo(() => {
    return productsWithBalance.filter(p => mobileMoneyOperators.some(op => op.id === p.id));
  }, [productsWithBalance, mobileMoneyOperators]);


  if (selectedProduct) {
      return (
          <AdminProductDetail 
            product={selectedProduct}
            allTransactions={allTransactions || []}
            onBack={() => setSelectedProduct(null)}
          />
      )
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="icon">
          <ArrowLeft />
        </Button>
        <CardHeader className="p-0">
            <CardTitle>Gestion des Facturiers</CardTitle>
            <CardDescription>Configurez les services externes, leurs frais et commissions. Cliquez sur un facturier pour voir ses détails.</CardDescription>
        </CardHeader>
      </div>
      
      <ProductTable 
        title="Facturiers"
        products={billersWithBalance}
        onAdd={(data) => addBiller(data)}
        onUpdate={(data) => updateBiller(data.id!, data)}
        onDelete={(id) => removeBiller(id)}
        onSettle={(id, amount) => settleBiller(id, amount)}
        onRowClick={(product) => setSelectedProduct(product)}
      />
       <ProductTable 
        title="Opérateurs Mobile Money"
        products={operatorsWithBalance}
        onAdd={(data) => addMobileMoneyOperator(data)}
        onUpdate={(data) => updateMobileMoneyOperator(data.id!, data)}
        onDelete={(id) => removeMobileMoneyOperator(id)}
        onSettle={(id, amount) => settleMobileMoneyOperator(id, amount)}
        onRowClick={(product) => setSelectedProduct(product)}
      />
    </div>
  );
}
