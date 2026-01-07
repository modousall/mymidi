

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth, createUserWithEmailAndPassword } from '@/firebase';
import { toast } from './use-toast';
import type { Vault } from './use-vaults';
import type { Tontine } from './use-tontine';
import type { CardDetails, CardTransaction } from './use-virtual-card';
import type { Transaction } from './use-transactions';

export type ManagedUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  alias: string; // phone number for login
  phoneNumber: string;
  merchantCode?: string; // public merchant code
  balance: number;
  avatar: string | null;
  isSuspended: boolean;
  role: string;
};

export type ManagedUserWithTransactions = ManagedUser & {
    transactions: Transaction[];
}

export type ManagedUserWithDetails = ManagedUserWithTransactions & {
    vaults: Vault[];
    tontines: Tontine[];
    virtualCard: (CardDetails & { transactions: CardTransaction[] }) | null;
}

export type NewUserPayload = {
    name: string;
    email: string;
    alias: string; // phone number
    merchantCode?: string;
    pincode: string;
    role: 'support' | 'admin' | 'merchant';
}

export const useUserManagement = () => {
  const firestore = useFirestore();
  const auth = useAuth();
  
  const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: usersData, refresh: refreshUsers } = useCollection<Omit<ManagedUser, 'id' | 'name'>>(usersQuery);
  
  const users = useMemo(() => {
    if (!usersData) return [];
    return usersData.map(u => ({ ...u, name: `${u.firstName} ${u.lastName}` }));
  }, [usersData]);

  // The concept of `usersWithTransactions` and `addTransactionForUser` becomes complex
  // with Firestore as the source of truth, as we'd need to fetch subcollections for all users.
  // This is inefficient. We'll rely on fetching transactions for a *specific* user when needed,
  // e.g., in the AdminUserDetail view.
  const usersWithTransactions: ManagedUserWithTransactions[] = [];
  const addTransactionForUser = (userAlias: string, transaction: Omit<Transaction, 'id' | 'userId'>, balanceChange: 'credit' | 'debit') => {
      console.warn("addTransactionForUser from useUserManagement is deprecated and should be handled via backend functions or direct Firestore calls within a user's context.");
  };

  const toggleUserSuspension = async (userId: string, suspend: boolean) => {
    const userDocRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userDocRef, { isSuspended: suspend });
      toast({ title: "Statut mis à jour", description: `L'utilisateur a été ${suspend ? 'suspendu' : 'réactivé'}.` });
      refreshUsers();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const userDocRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userDocRef, { role: newRole });
      toast({ title: "Rôle mis à jour", description: `Le rôle a été changé en ${newRole}.` });
      refreshUsers();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  // Note: Changing PIN/password should ideally be done through Firebase Auth's own mechanisms,
  // which would require the user's current password. This is a simplified admin reset.
  const resetUserPin = async (userId: string, newPin: string) => {
     toast({ title: "Non implémenté", description: "La réinitialisation du PIN admin doit être gérée côté serveur pour des raisons de sécurité.", variant: "destructive" });
  };

   const changeUserPin = (alias: string, oldPin: string, newPin:string) : {success: boolean, message: string} => {
       toast({ title: "Non implémenté", description: "La modification du PIN doit être gérée avec les fonctions Firebase Auth.", variant: "destructive" });
       return {success: false, message: "Non implémenté"};
   }


  return { 
      users: users as ManagedUser[], 
      usersWithTransactions, // This is now an empty array and should be phased out
      toggleUserSuspension, 
      resetUserPin, 
      updateUserRole, 
      changeUserPin, 
      refreshUsers,
      addTransactionForUser, // Deprecated
    };
};
