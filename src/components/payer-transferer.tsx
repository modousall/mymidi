

"use client"

import React, { useState } from 'react';
import PaymentForm from './payment-form';
import SplitBill from './split-bill';
import { Button } from './ui/button';
import { ArrowLeft, ArrowUp, Users, ChevronRight, Repeat, Globe } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import RecurringPayments from './recurring-payments';
import PiSpiForm from './pi-spi-form';


type PayerTransfererState = 'menu' | 'ponctuel' | 'recurrent' | 'pi-spi';

type PayerTransfererProps = {
    onBack: () => void;
}

const FeatureCard = ({ title, description, icon, onClick, colorClass, comingSoon = false }: { title: string, description: string, icon: JSX.Element, onClick: () => void, colorClass: string, comingSoon?: boolean }) => {
    
    const handleClick = () => {
        if (comingSoon) {
            toast({ title: "Bientôt disponible", description: "Cette fonctionnalité est en cours de développement." });
        } else {
            onClick();
        }
    }

    return (
        <Card 
            onClick={handleClick}
            className={cn("w-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5", comingSoon && "opacity-60 cursor-not-allowed")}
        >
            <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("p-3 rounded-full", colorClass)}>
                    {React.cloneElement(icon, { className: "h-6 w-6 text-white"})}
                </div>
                <div className="flex-grow">
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {!comingSoon && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </CardContent>
        </Card>
    );
};


export default function PayerTransferer({ onBack }: PayerTransfererProps) {
    const [state, setState] = useState<PayerTransfererState>('menu');

    const menuItems = [
        { id: 'ponctuel', title: "Transfert Ponctuel", description: "Envoyez de l'argent ou partagez une dépense.", icon: <ArrowUp />, colorClass: "bg-blue-500" },
        { id: 'pi-spi', title: "Transfert PI-SPI", description: "Envoyez vers une banque ou un autre wallet.", icon: <Globe />, colorClass: "bg-teal-500" },
        { id: 'recurrent', title: "Paiements Récurrents", description: "Programmez des abonnements ou transferts.", icon: <Repeat />, colorClass: "bg-purple-500" },
    ];
    
    if (state === 'ponctuel') {
        return (
             <div>
                 <div className="flex items-center gap-4 mb-4">
                    <Button onClick={() => setState('menu')} variant="ghost" size="icon">
                        <ArrowLeft />
                    </Button>
                    <h2 className="text-2xl font-bold text-primary">Transfert Ponctuel</h2>
                </div>
                 <PaymentForm />
                 <div className="my-6 text-center text-muted-foreground">ou</div>
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Users className="mr-2"/> Partager une dépense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Partager une dépense</DialogTitle>
                        </DialogHeader>
                        <SplitBill />
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

     if (state === 'recurrent') {
        return <RecurringPayments onBack={() => setState('menu')} />
    }
    
    if (state === 'pi-spi') {
        return <PiSpiForm onBack={() => setState('menu')} />
    }


    return (
         <div>
            <div className="flex items-center gap-4 mb-6">
                <Button onClick={onBack} variant="ghost" size="icon">
                    <ArrowLeft />
                </Button>
                <div>
                     <h2 className="text-2xl font-bold text-primary">Envoyer et recevoir</h2>
                     <p className="text-muted-foreground">Choisissez un type de transfert.</p>
                </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto'>
                {menuItems.map(item => (
                    <FeatureCard
                        key={item.id}
                        title={item.title}
                        description={item.description}
                        icon={item.icon}
                        colorClass={item.colorClass}
                        onClick={() => setState(item.id as PayerTransfererState)}
                    />
                ))}
            </div>
        </div>
    )
}
