
"use client";

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { toast } from './use-toast';

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

type UserManagementContextType = {
    users: ManagedUser[];
    changeUserPin: (alias: string, oldPin: string, newPin:string) => {success: boolean, message: string};
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

export const UserManagementProvider = ({ allUsers, children }: { allUsers: ManagedUser[], children: ReactNode }) => {

    const changeUserPin = (alias: string, oldPin: string, newPin:string) : {success: boolean, message: string} => {
       toast({ title: "Non implémenté", description: "La modification du PIN doit être gérée avec les fonctions Firebase Auth.", variant: "destructive" });
       return {success: false, message: "Non implémenté"};
   }

    const value = {
        users: allUsers,
        changeUserPin,
    };

    return (
        <UserManagementContext.Provider value={value}>
            {children}
        </UserManagementContext.Provider>
    );
};


export const useUserManagement = () => {
  const context = useContext(UserManagementContext);
  if (context === undefined) {
    throw new Error('useUserManagement must be used within a UserManagementProvider');
  }
  return context;
};
