

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from "uuid";

export type Transaction = {
  id: string;
  type: "sent" | "received" | "tontine" | "card_recharge" | "versement";
  counterparty: string;
  reason: string;
  date: string;
  amount: number;
  status: "Terminé" | "En attente" | "Échoué" | "Retourné";
};

type TransactionsContextType = {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  findPendingTransactionByCode: (code: string) => Transaction | undefined;
  updateTransactionStatus: (id: string, status: Transaction['status']) => void;
};

export const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

type TransactionsProviderProps = {
    children: ReactNode;
    alias: string;
};

export const TransactionsProvider = ({ children, alias }: TransactionsProviderProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const storageKey = `midi_transactions_${alias}`;

  useEffect(() => {
    try {
      const storedTransactions = localStorage.getItem(storageKey);
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      } else {
        setTransactions([]);
      }
    } catch (error) {
        console.error("Failed to parse transactions from localStorage", error);
        setTransactions([]);
    }
    setIsInitialized(true);
  }, [storageKey]);

  useEffect(() => {
    if(isInitialized) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(transactions));
        } catch (error) {
            console.error("Failed to write transactions to localStorage", error);
        }
    }
  }, [transactions, isInitialized, storageKey]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = {
        ...transaction,
        id: `TXN-${uuidv4()}`
    };
    setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
  };
  
  const findPendingTransactionByCode = (code: string): Transaction | undefined => {
    // This is a simplified search. In a real app, you'd query a backend.
    return transactions.find(tx => tx.status === 'En attente' && tx.reason.includes(code));
  }

  const updateTransactionStatus = (id: string, status: Transaction['status']) => {
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status } : tx));
  }

  const value = { transactions, addTransaction, findPendingTransactionByCode, updateTransactionStatus };

  return (
    <TransactionsContext.Provider value={value}>
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
