

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type BalanceContextType = {
  balance: number;
  credit: (amount: number) => void;
  debit: (amount: number) => void;
};

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

const initialBalance = 0;

type BalanceProviderProps = {
    children: ReactNode;
    alias: string;
};

export const BalanceProvider = ({ children, alias }: BalanceProviderProps) => {
  const [balance, setBalance] = useState<number>(initialBalance);
  const [isInitialized, setIsInitialized] = useState(false);

  const storageKey = `midi_balance_${alias}`;

  useEffect(() => {
    if (!alias) return;

    try {
      const storedBalance = localStorage.getItem(storageKey);
      if (storedBalance !== null) {
        setBalance(JSON.parse(storedBalance));
      } else {
        localStorage.setItem(storageKey, JSON.stringify(initialBalance));
        setBalance(initialBalance);
      }
    } catch (error) {
        console.error("Failed to parse balance from localStorage", error);
        setBalance(initialBalance);
    }
    setIsInitialized(true);
  }, [storageKey, alias]);

  useEffect(() => {
    if (isInitialized && alias) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(balance));
      } catch (error) {
        console.error("Failed to write balance to localStorage", error);
      }
    }
  }, [balance, isInitialized, storageKey, alias]);

  const credit = (amount: number) => {
    setBalance(prevBalance => prevBalance + amount);
  };

  const debit = (amount: number) => {
    setBalance(prevBalance => prevBalance - amount);
  };

  const value = { balance, credit, debit };

  return (
    <BalanceContext.Provider value={value}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
};
