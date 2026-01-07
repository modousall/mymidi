
'use client';

import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Fingerprint, ArrowLeft } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { useCms, CmsProvider } from "@/hooks/use-cms";

const icons: Record<string, React.ReactNode> = {
    "Chiffrement de Bout en Bout": <Lock className="h-6 w-6 text-blue-500" />,
    "Authentification Forte": <Fingerprint className="h-6 w-6 text-blue-500" />,
    "Conformité Réglementaire": <ShieldCheck className="h-6 w-6 text-blue-500" />,
};

function SecurityPageContent() {
    const { content } = useCms();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
             <main className="flex-grow container mx-auto px-4 py-12 md:py-24">
                <div className="text-center mb-12">
                    <ShieldCheck className="mx-auto h-16 w-16 text-primary mb-4" />
                    <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight">Votre Sécurité, Notre Priorité</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Des technologies de pointe pour protéger chaque transaction.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                         {content.pageFeatures.security.map((feature, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <div className="flex-shrink-0">{icons[feature.title] || <Lock className="h-6 w-6 text-blue-500" />}</div>
                                <div>
                                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                                    <p className="text-muted-foreground mt-1">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center">
                        <Image
                            src={content.images.security}
                            alt="Illustration de sécurité"
                            width={500}
                            height={400}
                            className="rounded-xl shadow-2xl"
                            data-ai-hint="security shield lock"
                        />
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

export default function SecurityPage() {
    return (
        <CmsProvider>
            <SecurityPageContent />
        </CmsProvider>
    )
}
