

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
  recentTransactions: Transaction[];
  historyTransactions: Transaction[];
  isLoading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>, forId?: string) => void;
  findPendingTransactionByCode: (code: string) => Transaction | undefined;
  updateTransactionStatus: (id: string, status: Transaction['status']) => void;
};

export const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

type TransactionsProviderProps = {
    children: ReactNode;
    forUserId?: string; // Optional user ID for admin/simulation views
};

export const TransactionsProvider = ({ children, forUserId }: TransactionsProviderProps) => {
  const { user } = useUser();
  const firestore = useFirestore();

  const targetUserId = forUserId || user?.uid;
  
  const [allLocalTransactions, setAllLocalTransactions] = useState<Transaction[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  const storageKey = targetUserId
    ? `midi_transactions_${targetUserId}`
    : null;

  // Effect for handling local storage. Now it loads ALL transactions for a specific user.
  useEffect(() => {
    if (!storageKey) {
        setAllLocalTransactions([]);
        setIsLocalLoading(false);
        return;
    };

    setIsLocalLoading(true);
    try {
      const storedTxs = localStorage.getItem(storageKey);
      setAllLocalTransactions(storedTxs ? JSON.parse(storedTxs) : []);
    } catch (e) { 
      console.error("Failed to read transactions from localStorage", e);
      setAllLocalTransactions([]);
    }
    setIsLocalLoading(false);
  }, [storageKey]);

  // Effect to save to local storage. Now it saves ALL transactions for a specific user.
  useEffect(() => {
    if (!isLocalLoading && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(allLocalTransactions));
      } catch (e) {
        console.error("Failed to write transactions to localStorage", e);
      }
    }
  }, [allLocalTransactions, isLocalLoading, storageKey]);


  const transactionsForCurrentUser = useMemo(() => {
      if (!targetUserId || isLocalLoading) return []; 
      return allLocalTransactions;
  }, [allLocalTransactions, targetUserId, isLocalLoading]);


  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>, forId?: string) => {
    const txUserId = forId || targetUserId;
    if (!txUserId) {
        console.error("Cannot add transaction, no user ID available or provided.");
        return;
    }
    const newTx: Transaction = {
        ...transaction,
        id: uuidv4(),
        date: new Date().toISOString(),
        userId: txUserId,
    };

    // If we are adding a transaction for the current user, update state
    if (txUserId === targetUserId) {
        setAllLocalTransactions(prev => [newTx, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else {
        // Otherwise, just update the local storage for the other user in the background
        const otherUserStorageKey = `midi_transactions_${txUserId}`;
        try {
            const otherUserTxsRaw = localStorage.getItem(otherUserStorageKey);
            const otherUserTxs = otherUserTxsRaw ? JSON.parse(otherUserTxsRaw) : [];
            const newOtherUserTxs = [newTx, ...otherUserTxs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            localStorage.setItem(otherUserStorageKey, JSON.stringify(newOtherUserTxs));
        } catch (e) {
            console.error(`Failed to update transactions for user ${txUserId}`, e);
        }
    }
  };
  
  const findPendingTransactionByCode = (code: string): Transaction | undefined => {
    // This now searches ALL transactions from ALL users stored locally
    // This is not ideal but works for simulation.
    // We need to iterate over all possible user storage keys.
     if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('midi_transactions_')) {
                try {
                    const storedTxs = localStorage.getItem(key);
                    const transactions: Transaction[] = storedTxs ? JSON.parse(storedTxs) : [];
                    const found = transactions.find(tx => tx.status === 'En attente' && tx.reason.includes(code));
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
     if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('midi_transactions_')) {
                 try {
                    const storedTxs = localStorage.getItem(key);
                    const transactions: Transaction[] = storedTxs ? JSON.parse(storedTxs) : [];
                    if(transactions.some(tx => tx.id === id)) {
                       const updatedTxs = transactions.map(tx => tx.id === id ? { ...tx, status } : tx);
                       localStorage.setItem(key, JSON.stringify(updatedTxs));

                       // If this is the current user's storage, update state too
                       if (key === storageKey) {
                           setAllLocalTransactions(updatedTxs);
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

  const recentTransactions = useMemo(() => {
    return transactionsForCurrentUser.slice(0, 5);
  }, [transactionsForCurrentUser]);

  const historyTransactions = useMemo(() => {
    return transactionsForCurrentUser;
  }, [transactionsForCurrentUser]);

  const value = { 
      recentTransactions,
      historyTransactions,
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

    
