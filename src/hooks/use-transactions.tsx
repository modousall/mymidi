
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { v4 as uuidv4 } from "uuid";


export type Transaction = {
  id: string;
  type: "sent" | "received" | "tontine" | "card_recharge" | "versement";
  counterparty: string;
  reason: string;
  date: string; // Should be ISO string
  amount: number;
  status: "Terminé" | "En attente" | "Échoué" | "Retourné";
  userId: string;
};

type TransactionsContextType = {
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => void;
  findPendingTransactionByCode: (code: string) => Transaction | undefined;
  updateTransactionStatus: (id: string, status: Transaction['status']) => void;
};

export const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

const allTransactionsStorageKey = 'midi_transactions_all';

type TransactionsProviderProps = {
    children: ReactNode;
    forUserId?: string; // Optional user ID for admin/simulation views
};

export const TransactionsProvider = ({ children, forUserId }: TransactionsProviderProps) => {
  const { user } = useUser();
  const firestore = useFirestore();

  // In simulation mode (forUserId is provided), we don't rely on the authenticated user.
  // In a real scenario, we use the authenticated user's UID.
  const targetUserId = forUserId || user?.uid;
  
  const [allLocalTransactions, setAllLocalTransactions] = useState<Transaction[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  // Effect for handling local storage. Now it loads ALL transactions.
  useEffect(() => {
      try {
        const storedTxs = localStorage.getItem(allTransactionsStorageKey);
        setAllLocalTransactions(storedTxs ? JSON.parse(storedTxs) : []);
      } catch (e) { 
        console.error("Failed to read transactions from localStorage", e);
        setAllLocalTransactions([]);
      }
      setIsLocalLoading(false);
  }, []);

  // Effect to save to local storage. Now it saves ALL transactions.
  useEffect(() => {
    if (!isLocalLoading) {
      try {
        localStorage.setItem(allTransactionsStorageKey, JSON.stringify(allLocalTransactions));
      } catch (e) {
        console.error("Failed to write transactions to localStorage", e);
      }
    }
  }, [allLocalTransactions, isLocalLoading]);


  const transactionsForCurrentUser = useMemo(() => {
      if (!targetUserId) return [];
      return allLocalTransactions.filter(tx => tx.userId === targetUserId);
  }, [allLocalTransactions, targetUserId]);


  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => {
    if (!targetUserId) {
        console.error("Cannot add transaction, no user ID available.");
        return;
    }
    const newTx: Transaction = {
        ...transaction,
        id: uuidv4(),
        date: new Date().toISOString(),
        userId: targetUserId,
    };

    setAllLocalTransactions(prev => [newTx, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  
  const findPendingTransactionByCode = (code: string): Transaction | undefined => {
    // This now searches ALL transactions, which is what we need.
    return allLocalTransactions.find(tx => tx.status === 'En attente' && tx.reason.includes(code));
  }

  const updateTransactionStatus = (id: string, status: Transaction['status']) => {
     setAllLocalTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status } : tx));
  }

  const value = { 
      transactions: transactionsForCurrentUser, 
      isLoading: isLocalLoading,
      addTransaction, 
      findPendingTransactionByCode, 
      updateTransactionStatus 
  };

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

    