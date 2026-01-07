
"use client";

import React, { createContext, useContext, ReactNode } from 'react';

export type Account = {
  accountId: string;
  type: "user" | "merchant";
};

const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ account, children }: { account: Account, children: ReactNode }) {
  return (
    <AccountContext.Provider value={account}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
