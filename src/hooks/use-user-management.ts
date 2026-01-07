
"use client";

import React, { createContext, useContext, ReactNode } from 'react';

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
  brandName?: string;
  ninea?: string;
  rccm?: string;
};

type UserManagementContextType = {
    users: ManagedUser[];
    changeUserPin: (alias: string, oldPin: string, newPin:string) => {success: boolean, message: string};
}

export const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

export const useUserManagement = () => {
  const context = useContext(UserManagementContext);
  if (context === undefined) {
    throw new Error('useUserManagement must be used within a UserManagementProvider');
  }
  return context;
};
