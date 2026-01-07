
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from './use-toast';
import type { Transaction } from './use-transactions';
import { formatCurrency } from '@/lib/utils';
import { useTransactions } from './use-transactions';

export type ProductItem = {
    id: string;
    name: string;
    fee: number;
    commission: number;
    isActive: boolean;
    alias?: string; // Added alias for selection
};

type ProductContextType = {
    billers: ProductItem[];
    addBiller: (biller: Omit<ProductItem, 'id'>) => void;
    updateBiller: (id: string, data: Partial<Omit<ProductItem, 'id'>>) => void;
    removeBiller: (id: string) => void;
    settleBiller: (id: string, amount: number) => void;
    
    mobileMoneyOperators: ProductItem[];
    addMobileMoneyOperator: (operator: Omit<ProductItem, 'id'>) => void;
    updateMobileMoneyOperator: (id: string, data: Partial<Omit<ProductItem, 'id'>>) => void;
    removeMobileMoneyOperator: (id: string) => void;
    settleMobileMoneyOperator: (id: string, amount: number) => void;
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const initialBillers: ProductItem[] = [
    { id: "SENELEC", name: "SENELEC - Électricité", fee: 150, commission: 50, isActive: true, alias: 'SENELEC' },
    { id: "SDE", name: "SDE - Eau", fee: 150, commission: 50, isActive: true, alias: 'SDE' },
    { id: "Orange", name: "Orange - Internet / Mobile", fee: 0, commission: 10, isActive: true, alias: 'Orange' },
    { id: "Free", name: "Free - Internet / Mobile", fee: 0, commission: 12, isActive: true, alias: 'Free' },
    { id: "Canal+", name: "Canal+ - TV", fee: 200, commission: 75, isActive: false, alias: 'Canal+' },
];

const initialMobileMoneyOperators: ProductItem[] = [
    { id: "Wave", name: "Wave", fee: 0, commission: 15, isActive: true, alias: 'Wave' },
    { id: "Orange Money", name: "Orange Money", fee: 0, commission: 20, isActive: true, alias: 'OrangeMoney' },
    { id: "Free Money", name: "Free Money", fee: 0, commission: 18, isActive: true, alias: 'FreeMoney' },
    { id: "Wizall", name: "Wizall Money", fee: 100, commission: 30, isActive: false, alias: 'Wizall' },
];

const billersStorageKey = 'midi_product_billers';
const operatorsStorageKey = 'midi_product_operators';

type ProductProviderProps = { 
    children: ReactNode;
}

export const ProductProvider = ({ children }: ProductProviderProps) => {
  const [billers, setBillers] = useState<ProductItem[]>([]);
  const [mobileMoneyOperators, setMobileMoneyOperators] = useState<ProductItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const transactionsContext = useContext(TransactionsContext);

  useEffect(() => {
    try {
      const storedBillers = localStorage.getItem(billersStorageKey);
      setBillers(storedBillers ? JSON.parse(storedBillers) : initialBillers);

      const storedOperators = localStorage.getItem(operatorsStorageKey);
      setMobileMoneyOperators(storedOperators ? JSON.parse(storedOperators) : initialMobileMoneyOperators);
    } catch (error) {
        console.error("Failed to parse products from localStorage", error);
        setBillers(initialBillers);
        setMobileMoneyOperators(initialMobileMoneyOperators);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(billersStorageKey, JSON.stringify(billers));
      } catch(e) { console.error(e); }
    }
  }, [billers, isInitialized]);
  
  useEffect(() => {
    if (isInitialized) {
        try {
            localStorage.setItem(operatorsStorageKey, JSON.stringify(mobileMoneyOperators));
        } catch(e) { console.error(e); }
    }
  }, [mobileMoneyOperators, isInitialized]);


  // --- Generic Handlers ---
  const handleAdd = (setter: React.Dispatch<React.SetStateAction<ProductItem[]>>, item: Omit<ProductItem, 'id'>) => {
    const newItem = { ...item, id: `${item.name.toLowerCase().replace(/ /g, '-')}-${Date.now()}` };
    setter(prev => [...prev, newItem]);
    toast({ title: "Produit ajouté", description: `"${item.name}" a été ajouté.` });
  }

  const handleUpdate = (setter: React.Dispatch<React.SetStateAction<ProductItem[]>>, id: string, data: Partial<Omit<ProductItem, 'id'>>) => {
      setter(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
      toast({ title: "Produit mis à jour", description: `"${data.name || 'Le produit'}" a été mis à jour.` });
  }

  const handleRemove = (setter: React.Dispatch<React.SetStateAction<ProductItem[]>>, id: string) => {
    setter(prev => prev.filter(b => b.id !== id));
    toast({ title: "Produit supprimé." });
  };
  
  const handleSettle = (products: ProductItem[], id: string, amount: number) => {
      const product = products.find(p => p.id === id);
      if (!product || !transactionsContext) return;
      
      transactionsContext.addTransaction({
        type: 'versement',
        counterparty: `Règlement Partenaire`,
        reason: `Règlement pour ${product.name}`,
        amount: amount,
        status: 'Terminé',
      });
      
      toast({ title: "Règlement enregistré", description: `Un versement de ${formatCurrency(amount)} a été enregistré pour ${product.name}. Le solde sera mis à jour.` });
  }

  const value = { 
      billers, 
      addBiller: (biller) => handleAdd(setBillers, biller),
      updateBiller: (id, data) => handleUpdate(setBillers, id, data),
      removeBiller: (id) => handleRemove(setBillers, id),
      settleBiller: (id, amount) => handleSettle(billers, id, amount),
      
      mobileMoneyOperators,
      addMobileMoneyOperator: (operator) => handleAdd(setMobileMoneyOperators, operator),
      updateMobileMoneyOperator: (id, data) => handleUpdate(setMobileMoneyOperators, id, data),
      removeMobileMoneyOperator: (id) => handleRemove(setMobileMoneyOperators, id),
      settleMobileMoneyOperator: (id, amount) => handleSettle(mobileMoneyOperators, id, amount),
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProductManagement = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProductManagement must be used within a ProductProvider');
  }
  return context;
};
