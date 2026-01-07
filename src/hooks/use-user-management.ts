

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
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

// This hook is deprecated and will be removed.
// User data should be fetched only within admin components where permissions are granted.
export const useUserManagement = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);

  useEffect(() => {
    // console.warn("useUserManagement is deprecated and should not be used for fetching all users.");
  }, []);
  
  const refreshUsers = useCallback(() => {
    // This function is now a no-op.
  }, []);

  const changeUserPin = (alias: string, oldPin: string, newPin:string) : {success: boolean, message: string} => {
       toast({ title: "Non implémenté", description: "La modification du PIN doit être gérée avec les fonctions Firebase Auth.", variant: "destructive" });
       return {success: false, message: "Non implémenté"};
   }
  
  return { 
      users: users, 
      refreshUsers,
      changeUserPin,
      // The following are stubs and should not be relied upon
      usersWithTransactions: [],
      toggleUserSuspension: async () => {},
      resetUserPin: async () => {},
      updateUserRole: async () => {},
      addTransactionForUser: () => {},
    };
};
