
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAccount } from '@/hooks/use-account';

export type Transaction = {
  id: string;
  type: "sent" | "received" | "tontine" | "card_recharge" | "versement";
  counterparty: string;
  reason: string;
  date: string; // Should be ISO string
  amount: number;
  status: "Terminé" | "En attente" | "Échoué" | "Retourné";
  accountId: string; // Changed from userId to accountId
};

type TransactionsContextType = {
  transactions: Transaction[];
  recentTransactions: Transaction[];
  historyTransactions: Transaction[];
  loading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'accountId'>) => void;
  findPendingTransactionByCode: (code: string) => Transaction | undefined;
  updateTransactionStatus: (id: string, status: Transaction['status']) => void;
};

export const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider = ({ children }: { children: ReactNode }) => {
  const { accountId } = useAccount();
  const storageKey = `midi_transactions_${accountId}`;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const raw = localStorage.getItem(storageKey);
    setTransactions(raw ? JSON.parse(raw) : []);
    setLoading(false);
  }, [storageKey]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(storageKey, JSON.stringify(transactions));
    }
  }, [transactions, loading, storageKey]);

  const addTransaction = (tx: Omit<Transaction, 'id' | 'date' | 'accountId'>) => {
    setTransactions(prev => [
      {
        ...tx,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        accountId,
      },
      ...prev,
    ]);
  };

  const findPendingTransactionByCode = (code: string): Transaction | undefined => {
    // This now searches ALL transactions from ALL users stored locally. This is a temporary simulation solution.
     if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('midi_transactions_')) {
                try {
                    const storedTxs = localStorage.getItem(key);
                    const userTransactions: Transaction[] = storedTxs ? JSON.parse(storedTxs) : [];
                    const found = userTransactions.find(tx => tx.status === 'En attente' && tx.reason.includes(code));
                    if(found) return found;
                } catch(e) {
                    // Ignore parsing errors for other keys
                }
            }
        }
    }
    return undefined;
  }

  const updateTransactionStatus = (id: string, status: Transaction['status']) => {
     // This logic is complex in a multi-user local storage scenario. We find the right user's storage and update it.
     if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('midi_transactions_')) {
                 try {
                    const storedTxs = localStorage.getItem(key);
                    const userTransactions: Transaction[] = storedTxs ? JSON.parse(storedTxs) : [];
                    if(userTransactions.some(tx => tx.id === id)) {
                       const updatedTxs = userTransactions.map(tx => tx.id === id ? { ...tx, status } : tx);
                       localStorage.setItem(key, JSON.stringify(updatedTxs));

                       // If this is the current user's storage, update state too
                       if (key === storageKey) {
                           setTransactions(updatedTxs);
                       }
                       return;
                    }
                } catch(e) {
                    // Ignore
                }
            }
        }
    }
  }

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        recentTransactions: transactions.slice(0, 5),
        historyTransactions: transactions,
        addTransaction,
        loading,
        findPendingTransactionByCode,
        updateTransactionStatus,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
};


export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
};
