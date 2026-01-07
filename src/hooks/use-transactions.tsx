
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
    // Only run query if there's a REAL authenticated user. forUserId is for local simulation.
    if (!user || !targetUserId || !firestore) return null;
    return query(
      collection(firestore, `users/${targetUserId}/transactions`),
      orderBy('date', 'desc')
    );
  }, [targetUserId, firestore, user]);
  
  const { data: rawTransactions, isLoading: isFirebaseLoading, error: firebaseError } = useCollection<Omit<Transaction, 'id' | 'date'> & { date: any }>(transactionsQuery);
  
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  // Effect for handling local storage in simulation mode
  useEffect(() => {
    // This runs only in simulation mode (forUserId is provided AND there's no real Firebase user)
    if (forUserId && !user) {
      const storageKey = `midi_transactions_${forUserId}`;
      try {
        const storedTxs = localStorage.getItem(storageKey);
        setLocalTransactions(storedTxs ? JSON.parse(storedTxs) : []);
      } catch (e) { 
        console.error("Failed to read transactions from localStorage", e);
        setLocalTransactions([]);
      }
      setIsLocalLoading(false);
    }
  }, [forUserId, user]);

  // Effect to save to local storage in simulation mode
  useEffect(() => {
    if (forUserId && !user && !isLocalLoading) {
      const storageKey = `midi_transactions_${forUserId}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(localTransactions));
      } catch (e) {
        console.error("Failed to write transactions to localStorage", e);
      }
    }
  }, [localTransactions, forUserId, user, isLocalLoading]);


  const transactions = useMemo(() => {
      // If in simulation mode, always use local transactions
      if (forUserId && !user) {
          return localTransactions;
      }
      // If in real mode, use Firestore data
      if (!rawTransactions) return [];
      return rawTransactions.map(tx => ({
          ...tx,
          date: tx.date?.toDate ? tx.date.toDate().toISOString() : new Date().toISOString(), // Fallback for new local items
      })) as Transaction[];
  }, [rawTransactions, localTransactions, forUserId, user]);


  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => {
    const newTx: Transaction = {
        ...transaction,
        id: uuidv4(),
        date: new Date().toISOString(),
        userId: targetUserId || 'simulated',
    };

    if (forUserId && !user) { // Simulation mode
        setLocalTransactions(prev => [newTx, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
