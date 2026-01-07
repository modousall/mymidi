
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

  const transactionsQuery = useMemoFirebase(() => {
    if (!targetUserId || !firestore) return null;
    return query(
      collection(firestore, `users/${targetUserId}/transactions`),
      orderBy('date', 'desc')
    );
  }, [targetUserId, firestore]);
  
  const { data: rawTransactions, isLoading: isFirebaseLoading } = useCollection<Omit<Transaction, 'id' | 'date'> & { date: any }>(transactionsQuery);
  
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  // Effect for handling local storage in simulation mode
  useEffect(() => {
    if (forUserId && !user) { // Simulation mode
      const storageKey = `midi_transactions_${forUserId}`;
      try {
        const storedTxs = localStorage.getItem(storageKey);
        if (storedTxs) {
          setLocalTransactions(JSON.parse(storedTxs));
        }
      } catch (e) { console.error(e); }
      setIsLocalLoading(false);
    }
  }, [forUserId, user]);

  useEffect(() => {
    if (forUserId && !user && !isLocalLoading) { // Simulation mode
      const storageKey = `midi_transactions_${forUserId}`;
      localStorage.setItem(storageKey, JSON.stringify(localTransactions));
    }
  }, [localTransactions, forUserId, user, isLocalLoading]);


  const transactions = useMemo(() => {
      if (forUserId && !user) { // Simulation mode
          return localTransactions;
      }
      if (!rawTransactions) return [];
      return rawTransactions.map(tx => ({
          ...tx,
          date: tx.date?.toDate ? tx.date.toDate().toISOString() : tx.date,
      })) as Transaction[];
  }, [rawTransactions, localTransactions, forUserId, user]);


  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => {
    const newTx = {
        ...transaction,
        id: uuidv4(),
        date: new Date().toISOString(),
        userId: targetUserId || 'simulated',
    };

    if (forUserId && !user) { // Simulation mode
        setLocalTransactions(prev => [newTx, ...prev]);
        return;
    }

    if (!targetUserId || !firestore) {
        console.error("User not authenticated or Firestore not available.");
        return;
    }

    const transactionsColRef = collection(firestore, `users/${targetUserId}/transactions`);
    
    addDoc(transactionsColRef, {
      ...transaction,
      userId: targetUserId,
      date: serverTimestamp(),
    }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: transactionsColRef.path,
            operation: 'create',
            requestResourceData: transaction,
        }));
    });
  };
  
  const findPendingTransactionByCode = (code: string): Transaction | undefined => {
    return transactions.find(tx => tx.status === 'En attente' && tx.reason.includes(code));
  }

  const updateTransactionStatus = (id: string, status: Transaction['status']) => {
     if (forUserId && !user) { // Simulation mode
        setLocalTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status } : tx));
        return;
    }

    if (!targetUserId || !firestore) return;
    const txDocRef = doc(firestore, `users/${targetUserId}/transactions`, id);
    
    updateDoc(txDocRef, { status }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: txDocRef.path,
            operation: 'update',
            requestResourceData: { status },
        }));
    });
  }

  const value = { 
      transactions: transactions, 
      isLoading: user ? isFirebaseLoading : isLocalLoading,
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
