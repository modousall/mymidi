
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => void;
  findPendingTransactionByCode: (code: string) => Transaction | undefined;
  updateTransactionStatus: (id: string, status: Transaction['status']) => void;
};

export const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

type TransactionsProviderProps = {
    children: ReactNode;
    alias: string;
};

export const TransactionsProvider = ({ children, alias }: TransactionsProviderProps) => {
  const { user } = useAuth();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, `users/${user.uid}/transactions`), 
        orderBy('date', 'desc')
    );
  }, [user, firestore]);

  const { data: transactions, isLoading } = useCollection<Omit<Transaction, 'id' | 'date'> & { date: any }>(transactionsQuery);

  const formattedTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.map(tx => ({
        ...tx,
        // The date from Firestore is a Timestamp object, convert it to ISO string
        date: tx.date?.toDate ? tx.date.toDate().toISOString() : new Date().toISOString(),
    }));
  }, [transactions]);


  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => {
    if (!user || !firestore) {
        console.error("User not authenticated or Firestore not available.");
        return;
    }
    const transactionsColRef = collection(firestore, `users/${user.uid}/transactions`);
    
    // Non-blocking write with error handling
    addDoc(transactionsColRef, {
      ...transaction,
      userId: user.uid,
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
    return formattedTransactions.find(tx => tx.status === 'En attente' && tx.reason.includes(code));
  }

  const updateTransactionStatus = (id: string, status: Transaction['status']) => {
    if (!user || !firestore) return;
    const txDocRef = doc(firestore, `users/${user.uid}/transactions`, id);
    
    // Non-blocking write with error handling
    updateDoc(txDocRef, { status }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: txDocRef.path,
            operation: 'update',
            requestResourceData: { status },
        }));
    });
  }

  const value = { 
      transactions: formattedTransactions, 
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
