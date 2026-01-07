

"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Transaction as UserTransaction } from './use-transactions';
import type { Vault } from './use-vaults';
import type { Tontine } from './use-tontine';
import type { CardDetails, CardTransaction } from './use-virtual-card';

export type ManagedUser = {
  name: string;
  email: string;
  alias: string;
  balance: number;
  avatar: string | null;
  isSuspended: boolean;
  role: string;
};

// Exporting Transaction type to be used in other components
export type Transaction = UserTransaction;

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
    alias: string;
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
            const transactionsDataString = localStorage.getItem(`midi_transactions_${alias}`);
            const vaultsDataString = localStorage.getItem(`midi_vaults_${alias}`);
            const tontinesDataString = localStorage.getItem(`midi_tontines_${alias}`);
            const virtualCardDataString = localStorage.getItem(`midi_virtual_card_${alias}`);
            const virtualCardTxDataString = localStorage.getItem(`midi_virtual_card_txs_${alias}`);
            
            const balance = balanceDataString ? JSON.parse(balanceDataString) : 0;
            const transactions: Transaction[] = transactionsDataString ? JSON.parse(transactionsDataString) : [];
            const vaults = vaultsDataString ? JSON.parse(vaultsDataString) : [];
            const tontines = tontinesDataString ? JSON.parse(tontinesDataString) : [];
            const virtualCardDetails = virtualCardDataString ? JSON.parse(virtualCardDataString) : null;
            const virtualCardTxs = virtualCardTxDataString ? JSON.parse(virtualCardTxDataString) : [];
            
            const virtualCard = virtualCardDetails ? { ...virtualCardDetails, transactions: virtualCardTxs } : null;

            // Ensure global uniqueness for transaction keys in admin views
            const uniqueTransactions = transactions.map(tx => ({
                ...tx,
                id: `${alias}-${tx.id}`
            }));


            const managedUser = {
              name: userData.name,
              email: userData.email,
              alias: alias,
              balance: balance,
              avatar: avatarDataString || null,
              isSuspended: userData.isSuspended || false,
              role: userData.role || 'user',
            };

            loadedUsersWithDetails.push({ ...managedUser, transactions: uniqueTransactions, vaults, tontines, virtualCard });

          } catch (e) {
            console.error(`Failed to parse data for user ${alias}`, e);
          }
        }
      }
    }
    setUsers(loadedUsersWithDetails);
    setUsersWithTransactions(loadedUsersWithDetails.map(({ vaults, tontines, virtualCard, ...rest }) => rest));

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
        return { success: false, message: "Cet alias est déjà utilisé." };
    }

    const newUser = {
        name: payload.name,
        email: payload.email,
        pincode: payload.pincode,
        role: payload.role,
        isSuspended: false,
    };

    localStorage.setItem(userKey, JSON.stringify(newUser));
    // Initialize other user-related data
    localStorage.setItem(`midi_balance_${payload.alias}`, '0');
    localStorage.setItem(`midi_transactions_${payload.alias}`, '[]');
    localStorage.setItem(`midi_contacts_${payload.alias}`, '[]');
    localStorage.setItem(`midi_vaults_${payload.alias}`, '[]');
    localStorage.setItem(`midi_tontines_${payload.alias}`, '[]');
    
    loadUsers(); // Force reload of all users to reflect change
    return { success: true, message: "Utilisateur créé avec succès." };
  };

  const addTransactionForUser = (userAlias: string, transaction: Omit<Transaction, 'id'>, balanceChange: 'credit' | 'debit') => {
      const balanceKey = `midi_balance_${userAlias}`;
      const txKey = `midi_transactions_${userAlias}`;
      
      // Update Balance
      const currentBalanceStr = localStorage.getItem(balanceKey);
      const currentBalance = currentBalanceStr ? JSON.parse(currentBalanceStr) : 0;
      const newBalance = balanceChange === 'credit' ? currentBalance + transaction.amount : currentBalance - transaction.amount;
      localStorage.setItem(balanceKey, JSON.stringify(newBalance));

      // Update Transactions
      const currentTxsStr = localStorage.getItem(txKey);
      const currentTxs = currentTxsStr ? JSON.parse(currentTxsStr) : [];
      const newTx = { ...transaction, id: `TXN-${Date.now()}-${Math.random()}` };
      localStorage.setItem(txKey, JSON.stringify([newTx, ...currentTxs]));

      // This will trigger the global state update
      loadUsers();
  };


  return { users, usersWithTransactions, toggleUserSuspension, resetUserPin, addUser, updateUserRole, changeUserPin, refreshUsers: loadUsers, addTransactionForUser };
};
