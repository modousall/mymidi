

"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Vault } from './use-vaults';
import type { Tontine } from './use-tontine';
import type { CardDetails, CardTransaction } from './use-virtual-card';
import { v4 as uuidv4 } from 'uuid';

export type ManagedUser = {
  name: string;
  email: string;
  alias: string; // phone number for login
  merchantCode?: string; // public merchant code
  balance: number;
  avatar: string | null;
  isSuspended: boolean;
  role: string;
};

// Re-exporting this from the new source of truth when needed
// For now, we define it locally for the ManagedUser types
export type Transaction = {
    id: string;
    type: "sent" | "received" | "tontine" | "card_recharge" | "versement";
    counterparty: string;
    reason: string;
    date: string; // ISO string
    amount: number;
    status: "Terminé" | "En attente" | "Échoué" | "Retourné";
    userId: string;
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
  const [users, setUsers] = useState<ManagedUserWithDetails[]>([]);
  const [usersWithTransactions, setUsersWithTransactions] = useState<ManagedUserWithTransactions[]>([]);

  const loadUsers = useCallback(() => {
    const loadedUsersWithDetails: ManagedUserWithDetails[] = [];
    
    if (typeof window === 'undefined') {
        return;
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('midi_user_')) {
        const alias = key.replace('midi_user_', '');
        const userDataString = localStorage.getItem(key);
        
        if (userDataString) {
          try {
            const userData = JSON.parse(userDataString);

            // Fetch all related data from localStorage
            const balanceDataString = localStorage.getItem(`midi_balance_${alias}`);
            const avatarDataString = localStorage.getItem(`midi_avatar_${alias}`);
            const vaultsDataString = localStorage.getItem(`midi_vaults_${alias}`);
            const tontinesDataString = localStorage.getItem(`midi_tontines_${alias}`);
            const virtualCardDataString = localStorage.getItem(`midi_virtual_card_${alias}`);
            const virtualCardTxDataString = localStorage.getItem(`midi_virtual_card_txs_${alias}`);
            
            // Transactions are no longer stored per user in local storage this way.
            // We load an empty array here. Components should use the useTransactions hook for the current user.
            // For admin views showing ALL transactions, a different approach is needed.
            const transactions: Transaction[] = [];

            const balance = balanceDataString ? JSON.parse(balanceDataString) : 0;
            const vaults = vaultsDataString ? JSON.parse(vaultsDataString) : [];
            const tontines = tontinesDataString ? JSON.parse(tontinesDataString) : [];
            const virtualCardDetails = virtualCardDataString ? JSON.parse(virtualCardDataString) : null;
            const virtualCardTxs = virtualCardTxDataString ? JSON.parse(virtualCardTxDataString) : [];
            
            const virtualCard = virtualCardDetails ? { ...virtualCardDetails, transactions: virtualCardTxs } : null;

            const managedUser = {
              name: userData.name,
              email: userData.email,
              alias: alias,
              merchantCode: userData.merchantCode,
              balance: balance,
              avatar: avatarDataString || null,
              isSuspended: userData.isSuspended || false,
              role: userData.role || 'user',
            };

            loadedUsersWithDetails.push({ ...managedUser, transactions, vaults, tontines, virtualCard });

          } catch (e) {
            console.error(`Failed to parse data for user ${alias}`, e);
          }
        }
      }
    }
    setUsers(loadedUsersWithDetails);
    
    // This part is for the admin dashboard to show all transactions from all users
    const allUsersWithTransactions: ManagedUserWithTransactions[] = loadedUsersWithDetails.map(user => {
      const transactionsDataString = localStorage.getItem(`midi_transactions_${user.alias}`);
      const transactions: Transaction[] = transactionsDataString ? JSON.parse(transactionsDataString) : [];
      return {
          ...user,
          // IMPORTANT: Prefix transaction ID with user alias to guarantee uniqueness in admin views
          transactions: transactions.map(tx => ({...tx, id: `${user.alias}-${tx.id}`}))
      };
    });
    setUsersWithTransactions(allUsersWithTransactions);

  }, []);

  useEffect(() => {
    loadUsers();
    
    const handleStorageChange = () => loadUsers();
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    }

  }, [loadUsers]);

  const updateUserProperty = (alias: string, update: (userData: any) => void) => {
    const userKey = `midi_user_${alias}`;
    const userDataString = localStorage.getItem(userKey);
    if (userDataString) {
        try {
            const userData = JSON.parse(userDataString);
            update(userData);
            localStorage.setItem(userKey, JSON.stringify(userData));
            loadUsers(); // Refresh state for all components
        } catch(e) {
            console.error(`Failed to update data for user ${alias}`, e);
        }
    }
  };

  const toggleUserSuspension = (alias: string, suspend: boolean) => {
    updateUserProperty(alias, userData => {
        userData.isSuspended = suspend;
    });
  };

  const resetUserPin = (alias: string, newPin: string) => {
     updateUserProperty(alias, userData => {
        userData.pincode = newPin;
    });
  };

  const changeUserPin = (alias: string, oldPin: string, newPin: string): { success: boolean, message: string } => {
    const userKey = `midi_user_${alias}`;
    const userDataString = localStorage.getItem(userKey);
    if (userDataString) {
        try {
            const userData = JSON.parse(userDataString);
            if (userData.pincode !== oldPin) {
                return { success: false, message: "L'ancien code PIN est incorrect." };
            }
            userData.pincode = newPin;
            localStorage.setItem(userKey, JSON.stringify(userData));
            loadUsers();
            return { success: true, message: "Code PIN mis à jour avec succès." };
        } catch (e) {
            return { success: false, message: "Une erreur est survenue." };
        }
    }
    return { success: false, message: "Utilisateur non trouvé." };
  };

  const updateUserRole = (alias: string, newRole: string) => {
    updateUserProperty(alias, userData => {
      userData.role = newRole;
    });
  };

  const addUser = (payload: NewUserPayload): { success: boolean, message: string } => {
    const userKey = `midi_user_${payload.alias}`;
    if (localStorage.getItem(userKey)) {
        return { success: false, message: "Ce numéro de téléphone est déjà utilisé." };
    }

    const newUser: any = {
        name: payload.name,
        email: payload.email,
        pincode: payload.pincode,
        role: payload.role,
        isSuspended: false,
    };

    if(payload.role === 'merchant') {
        newUser.merchantCode = payload.merchantCode;
    }

    localStorage.setItem(userKey, JSON.stringify(newUser));
    localStorage.setItem(`midi_balance_${payload.alias}`, '0');
    // Transaction logic is now fully handled by useTransactions hook with Firestore
    localStorage.setItem(`midi_contacts_${payload.alias}`, '[]');
    localStorage.setItem(`midi_vaults_${payload.alias}`, '[]');
    localStorage.setItem(`midi_tontines_${payload.alias}`, '[]');
    
    loadUsers(); 
    return { success: true, message: "Utilisateur créé avec succès." };
  };

  const addTransactionForUser = (userAlias: string, transaction: Omit<Transaction, 'id' | 'userId'>, balanceChange: 'credit' | 'debit') => {
      // This function now only handles balance. Transaction is added via useTransactions.
      // This might need to be refactored further if balance is also moved to Firestore.
      const balanceKey = `midi_balance_${userAlias}`;
      const currentBalanceStr = localStorage.getItem(balanceKey);
      const currentBalance = currentBalanceStr ? JSON.parse(currentBalanceStr) : 0;
      const newBalance = balanceChange === 'credit' ? currentBalance + transaction.amount : currentBalance - transaction.amount;
      localStorage.setItem(balanceKey, JSON.stringify(newBalance));
      
      // We don't add the transaction to localStorage here anymore.
      // The component that calls this should call the addTransaction from useTransactions.
      // This is a temporary measure during refactoring. In a real app, this logic
      // would be on the backend or in a more centralized client-side service.
      
      loadUsers();
  };

  return { users, usersWithTransactions, toggleUserSuspension, resetUserPin, addUser, updateUserRole, changeUserPin, refreshUsers: loadUsers, addTransactionForUser };
};

    