
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Contact = {
  id: string;
  name: string;
  alias: string;
};

type ContactsContextType = {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id'>) => void;
  removeContact: (id: string) => void;
};

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

const initialContacts: Contact[] = [];

type ContactsProviderProps = {
    children: ReactNode;
    alias: string;
};

export const ContactsProvider = ({ children, alias }: ContactsProviderProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const storageKey = `midi_contacts_${alias}`;

  useEffect(() => {
    if (!alias) return;

    try {
      const storedContacts = localStorage.getItem(storageKey);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      } else {
        setContacts(initialContacts);
      }
    } catch (error) {
        console.error("Failed to parse contacts from localStorage", error);
        setContacts(initialContacts);
    }
    setIsInitialized(true);
  }, [storageKey, alias]);

  useEffect(() => {
    if (isInitialized) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(contacts));
        } catch (error) {
            console.error("Failed to write contacts to localStorage", error);
        }
    }
  }, [contacts, isInitialized, storageKey]);

  const addContact = (contact: Omit<Contact, 'id'>) => {
    const isDuplicate = contacts.some(c => c.name === contact.name || c.alias === contact.alias);
    if(isDuplicate) {
        console.warn("Attempted to add a duplicate contact.");
        return;
    }
    const newContact = { ...contact, id: Date.now().toString() };
    setContacts(prevContacts => [...prevContacts, newContact]);
  };

  const removeContact = (id: string) => {
    setContacts(prevContacts => prevContacts.filter(c => c.id !== id));
  };

  const value = { contacts, addContact, removeContact };

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};
