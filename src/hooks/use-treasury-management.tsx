

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from './use-toast';
import { format } from 'date-fns';

export type TreasuryOperation = {
  id: string;
  date: string;
  type: string;
  from: string;
  to: string;
  amount: number;
  status: 'Terminé' | 'En attente';
  description: string;
};

export type TreasuryData = {
    ownFunds: number;
    clientFunds: number;
    assets: {
        centralBank: number;
        commercialBanks: number;
        mobileMoneyOperators: number;
        foreignCorrespondents: number;
    };
    operations: TreasuryOperation[];
}

type TreasuryContextType = {
  treasuryData: TreasuryData;
  addOperation: (operation: Omit<TreasuryOperation, 'id' | 'date' | 'status'>) => void;
};

const TreasuryContext = createContext<TreasuryContextType | undefined>(undefined);

const initialTreasuryData: TreasuryData = {
    ownFunds: 0,
    clientFunds: 0,
    assets: {
        centralBank: 0,
        commercialBanks: 0,
        mobileMoneyOperators: 0,
        foreignCorrespondents: 0,
    },
    operations: []
};

const treasuryStorageKey = 'midi_treasury_data';

export const TreasuryProvider = ({ children }: { children: ReactNode }) => {
  const [treasuryData, setTreasuryData] = useState<TreasuryData>(initialTreasuryData);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(treasuryStorageKey);
      if (storedData) {
        setTreasuryData(JSON.parse(storedData));
      } else {
        setTreasuryData(initialTreasuryData);
      }
    } catch (error) {
        console.error("Failed to parse treasury data from localStorage", error);
        setTreasuryData(initialTreasuryData);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
        try {
            localStorage.setItem(treasuryStorageKey, JSON.stringify(treasuryData));
        } catch (error) {
            console.error("Failed to write treasury data to localStorage", error);
        }
    }
  }, [treasuryData, isInitialized]);

  const addOperation = (operation: Omit<TreasuryOperation, 'id' | 'date' | 'status'>) => {
    
    setTreasuryData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData)); // Deep copy

        const { from, to, amount } = operation;

        // Decrease 'from' account
        if (from === 'Fonds Propres') newData.ownFunds -= amount;
        else if (from === 'Fonds Clients') newData.clientFunds -= amount;
        else {
             const fromKey = Object.keys(newData.assets).find(k => k.toLowerCase().replace(/ /g, '') === from.toLowerCase().replace(/ /g, ''));
             if(fromKey) (newData.assets as any)[fromKey] -= amount;
        }

        // Increase 'to' account
        if (to === 'Fonds Propres') newData.ownFunds += amount;
        else if (to === 'Fonds Clients') newData.clientFunds += amount;
        else {
            const toKey = Object.keys(newData.assets).find(k => k.toLowerCase().replace(/ /g, '') === to.toLowerCase().replace(/ /g, ''));
            if(toKey) (newData.assets as any)[toKey] += amount;
        }

        // Add operation to list
        const newOperation: TreasuryOperation = {
            ...operation,
            id: `op-${Date.now()}`,
            date: format(new Date(), 'yyyy-MM-dd'),
            status: 'Terminé',
        };

        newData.operations = [newOperation, ...newData.operations];

        toast({ title: "Opération enregistrée", description: `Le mouvement de ${amount} a été effectué.` });
        return newData;
    });
  };

  const value = { treasuryData, addOperation };

  return (
    <TreasuryContext.Provider value={value}>
      {children}
    </TreasuryContext.Provider>
  );
};

export const useTreasuryManagement = () => {
  const context = useContext(TreasuryContext);
  if (context === undefined) {
    throw new Error('useTreasuryManagement must be used within a TreasuryProvider');
  }
  return context;
};
