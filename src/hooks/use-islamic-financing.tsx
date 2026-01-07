

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { islamicFinancingAssessment } from '@/ai/flows/islamic-financing-flow';
import { useTransactions } from './use-transactions';
import { useBalance } from './use-balance';
import type { FinancingRequest, IslamicFinancingOutput, IslamicFinancingInput } from '@/lib/types';
import { useUserManagement } from './use-user-management';
import { toast } from './use-toast';
import { useAuth } from '@/firebase';

type SubmitRequestPayload = {
    financingType: string;
    amount: number;
    durationMonths: number;
    purpose: string;
};

type IslamicFinancingContextType = {
  allRequests: FinancingRequest[];
  myRequests: FinancingRequest[];
  submitRequest: (payload: SubmitRequestPayload, clientAlias?: string) => Promise<IslamicFinancingOutput>;
  updateRequestStatus: (id: string, status: 'approved' | 'rejected') => void;
};

const IslamicFinancingContext = createContext<IslamicFinancingContextType | undefined>(undefined);

const financingStorageKey = 'midi_financing_requests';

type IslamicFinancingProviderProps = {
    children: ReactNode;
    alias: string;
};

export const IslamicFinancingProvider = ({ children, alias }: IslamicFinancingProviderProps) => {
  const [allRequests, setAllRequests] = useState<FinancingRequest[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { transactions, addTransaction } = useTransactions();
  const { balance, credit } = useBalance();
  const { user } = useAuth();
  
  useEffect(() => {
    try {
      const storedRequests = localStorage.getItem(financingStorageKey);
      if (storedRequests) {
        setAllRequests(JSON.parse(storedRequests));
      }
    } catch (error) {
        console.error("Failed to parse Financing requests from localStorage", error);
        setAllRequests([]);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
        try {
            localStorage.setItem(financingStorageKey, JSON.stringify(allRequests));
        } catch (error) {
            console.error("Failed to write Financing requests to localStorage", error);
        }
    }
  }, [allRequests, isInitialized]);
  
  const myRequests = useMemo(() => {
      return allRequests.filter(req => req.alias === alias);
  }, [allRequests, alias]);
  
  const submitRequest = async (payload: SubmitRequestPayload, clientAlias?: string): Promise<IslamicFinancingOutput> => {
      const targetAlias = clientAlias || alias;
      
      const transactionHistory = transactions.slice(0, 10).map(t => ({ amount: t.amount, type: t.type, date: t.date }));

      const assessmentInput: IslamicFinancingInput = {
        alias: targetAlias,
        financingType: payload.financingType,
        amount: payload.amount,
        durationMonths: payload.durationMonths,
        purpose: payload.purpose,
        currentBalance: balance,
        transactionHistory,
      }

      const assessmentResult = await islamicFinancingAssessment(assessmentInput);

      const newRequest: FinancingRequest = {
          id: `fin-${Date.now()}`,
          alias: targetAlias,
          ...payload,
          status: assessmentResult.status,
          reason: assessmentResult.reason,
          repaymentPlan: assessmentResult.repaymentPlan,
          scores: assessmentResult.scores,
          requestDate: new Date().toISOString(),
      };
      
      setAllRequests(prev => [...prev, newRequest]);
      
      if (assessmentResult.status === 'approved') {
          if (targetAlias === alias) {
              credit(payload.amount);
              addTransaction({
                  type: 'received',
                  counterparty: 'Financement Islamique',
                  reason: `Financement approuvé pour: ${payload.purpose}`,
                  amount: payload.amount,
                  status: 'Terminé'
              });
          } else {
              toast({ title: "Approuvé (Admin)", description: "La demande a été approuvée. Les transactions seraient effectuées pour le client dans un vrai système." });
          }
      }

      return assessmentResult;
  };

  const updateRequestStatus = (id: string, status: 'approved' | 'rejected') => {
      const requestToUpdate = allRequests.find(r => r.id === id);
      if (!requestToUpdate) {
        toast({ title: "Erreur", description: "Demande de financement introuvable.", variant: "destructive" });
        return;
      }
      
      setAllRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
      
      toast({ title: `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}`, description: `La demande de financement de ${requestToUpdate.alias} a été mise à jour.`})
  }
  
  const value = { allRequests, myRequests, submitRequest, updateRequestStatus };

  return (
    <IslamicFinancingContext.Provider value={value}>
      {children}
    </IslamicFinancingContext.Provider>
  );
};

export const useIslamicFinancing = () => {
  const context = useContext(IslamicFinancingContext);
  if (context === undefined) {
    throw new Error('useIslamicFinancing must be used within a IslamicFinancingProvider');
  }
  return context;
};
