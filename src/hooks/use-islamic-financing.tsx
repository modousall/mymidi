

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { islamicFinancingAssessment } from '@/ai/flows/islamic-financing-flow';
import { useTransactions } from './use-transactions';
import { useBalance } from './use-balance';
import type { FinancingRequest, IslamicFinancingOutput, IslamicFinancingInput } from '@/lib/types';
import { useUserManagement } from './use-user-management';
import { toast } from './use-toast';

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
  const { addTransaction } = useTransactions();
  const { credit } = useBalance();
  const { usersWithTransactions, addTransactionForUser } = useUserManagement();

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
      
      const userWithTx = usersWithTransactions.find(u => u.alias === targetAlias);
      if (!userWithTx) {
          throw new Error("Impossible de trouver l'utilisateur pour l'évaluation.");
      }
      
      const transactionHistory = userWithTx.transactions.slice(0, 10).map(t => ({ amount: t.amount, type: t.type, date: t.date }));

      const assessmentInput: IslamicFinancingInput = {
        alias: targetAlias,
        financingType: payload.financingType,
        amount: payload.amount,
        durationMonths: payload.durationMonths,
        purpose: payload.purpose,
        currentBalance: userWithTx.balance,
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
                  date: new Date().toISOString(),
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
        console.error("Financing request not found");
        return;
      }
      
      const wasInReview = requestToUpdate.status === 'review';

      setAllRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
      
       if (wasInReview && status === 'approved') {
          try {
            const userToCredit = usersWithTransactions.find(u => u.alias === requestToUpdate.alias);
             if (!userToCredit) {
                throw new Error("Utilisateur introuvable pour la transaction de financement.");
            }
            
            addTransactionForUser(userToCredit.alias, {
                type: 'received',
                counterparty: 'Financement Interne',
                reason: `Financement approuvé pour: ${requestToUpdate.purpose}`,
                amount: requestToUpdate.amount,
                date: new Date().toISOString(),
                status: 'Terminé'
            }, 'credit');

            toast({ title: "Demande approuvée", description: `Le solde de ${requestToUpdate.alias} a été crédité.` });

          } catch (error: any) {
              console.error("Failed to process manual financing approval:", error);
              toast({ title: "Erreur de traitement", description: error.message || "Une erreur est survenue lors de l'approbation.", variant: "destructive" });
              setAllRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'review' } : req));
          }
      } else {
         toast({ title: `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}`, description: `La demande de financement de ${requestToUpdate.alias} a été mise à jour.`})
      }
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

    
