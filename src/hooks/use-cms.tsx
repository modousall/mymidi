
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CmsContent = {
  hero: {
    title: string;
    subtitle: string;
    description: string;
  };
  features: {
    id: string;
    href: string;
    title: string;
    description: string;
  }[];
  images: {
    financing: string;
    savings: string;
    payments: string;
    security: string;
  };
  pageFeatures: {
    financing: { title: string; description: string }[];
    savings: { title: string; description: string }[];
    payments: { title: string; description: string }[];
    security: { title: string; description: string }[];
  }
};

export const defaultContent: CmsContent = {
  hero: {
    title: "Midi",
    subtitle: "Microfinance Islamique Digitale et Inclusive.",
    description: "Gérez votre argent, financez vos projets et épargnez en toute sérénité.",
  },
  features: [
    {
      id: "financing",
      href: "/financing",
      title: "Financement Conforme",
      description: "Financez vos projets et achats (Mourabaha) en accord avec les principes éthiques.",
    },
    {
      id: "savings",
      href: "/savings",
      title: "Épargne & Tontine",
      description: "Constituez votre épargne dans des coffres ou participez à des tontines collaboratives.",
    },
    {
      id: "payments",
      href: "/payments",
      title: "Paiements Éthiques",
      description: "Envoyez et recevez de l'argent instantanément, avec des frais justes et transparents.",
    },
    {
      id: "security",
      href: "/security",
      title: "Sécurité & Conformité",
      description: "Vos transactions sont protégées et conformes aux plus hauts standards de sécurité.",
    },
  ],
  images: {
    financing: "https://placehold.co/600x400.png",
    savings: "https://placehold.co/600x400.png",
    payments: "https://placehold.co/600x400.png",
    security: "https://placehold.co/600x400.png",
  },
  pageFeatures: {
    financing: [
        { title: "Conformité Mourabaha", description: "Nous achetons le bien pour vous et vous le revendons à un coût majoré convenu, sans intérêt." },
        { title: "Transparence Totale", description: "Pas de frais cachés. Le coût du financement est clair et fixé dès le départ." },
        { title: "Flexibilité de Remboursement", description: "Adaptez les échéances à votre capacité de remboursement pour une gestion sereine." },
    ],
    savings: [
        { title: "Coffres Personnels", description: "Créez des 'tirelires' virtuelles pour mettre de l'argent de côté pour vos projets personnels, petits ou grands." },
        { title: "Tontines Collaboratives", description: "Rejoignez ou créez des groupes d'épargne rotatifs avec vos proches pour atteindre des objectifs communs." },
        { title: "Atteignez vos Objectifs", description: "Fixez des montants cibles pour vos coffres et suivez votre progression en temps réel." },
    ],
    payments: [
        { title: "Instantanéité", description: "Envoyez et recevez de l'argent en quelques secondes, 24/7." },
        { title: "Frais Justes", description: "Des coûts de transaction minimes et clairement affichés. Pas de surprises." },
        { title: "Paiements Simplifiés", description: "Utilisez un simple alias, un numéro de téléphone ou un QR code pour toutes vos transactions." },
    ],
    security: [
        { title: "Chiffrement de Bout en Bout", description: "Toutes vos données et transactions sont chiffrées pour garantir leur confidentialité." },
        { title: "Authentification Forte", description: "Votre compte est protégé par un code PIN unique que vous seul connaissez." },
        { title: "Conformité Réglementaire", description: "Nous opérons en accord avec les standards des institutions financières pour protéger vos fonds." },
    ]
  }
};

const cmsStorageKey = 'midi_cms_content';

type CmsContextType = {
  content: CmsContent;
  setContent: (newContent: CmsContent) => void;
};

const CmsContext = createContext<CmsContextType | undefined>(undefined);

export const CmsProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContentState] = useState<CmsContent>(defaultContent);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedContent = localStorage.getItem(cmsStorageKey);
      if (storedContent) {
        const parsed = JSON.parse(storedContent);
        // Merge with default to avoid missing keys if structure changed
        setContentState({
          ...defaultContent,
          ...parsed,
          hero: { ...defaultContent.hero, ...parsed.hero },
          features: parsed.features || defaultContent.features,
          images: { ...defaultContent.images, ...parsed.images },
          pageFeatures: parsed.pageFeatures ? {
            ...defaultContent.pageFeatures,
            ...parsed.pageFeatures,
          } : defaultContent.pageFeatures,
        });
      }
    } catch (error) {
      console.error("Failed to read CMS content from localStorage", error);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(cmsStorageKey, JSON.stringify(content));
      } catch (error) {
        console.error("Failed to write CMS content to localStorage", error);
      }
    }
  }, [content, isInitialized]);

  const setContent = (newContent: CmsContent) => {
    setContentState(newContent);
  };

  return (
    <CmsContext.Provider value={{ content, setContent }}>
      {children}
    </CmsContext.Provider>
  );
};

export const useCms = () => {
  const context = useContext(CmsContext);
  if (context === undefined) {
    throw new Error('useCms must be used within a CmsProvider');
  }
  return context;
};
