
'use client';

import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, ArrowLeft } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { useCms, CmsProvider } from "@/hooks/use-cms";

function PaymentsPageContent() {
    const { content } = useCms();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
             <main className="flex-grow container mx-auto px-4 py-12 md:py-24">
                <div className="text-center mb-12">
                    <Zap className="mx-auto h-16 w-16 text-primary mb-4" />
                    <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight">Paiements Instantanés et Éthiques</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        L'argent circule librement, en toute confiance.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-12 items-center">
                     <div className="flex justify-center">
                        <Image
                            src={content.images.payments}
                            alt="Illustration de paiement mobile"
                            width={500}
                            height={400}
                            className="rounded-xl shadow-2xl"
                            data-ai-hint="mobile payment phone"
                        />
                    </div>
                    <div className="space-y-8">
                         {content.pageFeatures.payments.map((feature, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <ArrowRight className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                                    <p className="text-muted-foreground mt-1">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                 <div className="text-center mt-16">
                     <Link href="/">
                        <Button size="lg" className="h-12 text-base">
                             <ArrowLeft className="mr-2"/> Retour à l'accueil
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}

export default function PaymentsPage() {
    return (
        <CmsProvider>
            <PaymentsPageContent />
        </CmsProvider>
    )
}
