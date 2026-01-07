'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loginWithIdentifier, signupWithDetails, type SignUpDetails } from '@/lib/auth';

type AuthMode = 'login' | 'signup';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Ce champ est requis.'),
  pin: z.string().min(4, 'Le PIN doit contenir 4 chiffres.').max(4, 'Le PIN doit contenir 4 chiffres.'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'Le prénom est requis.'),
  lastName: z.string().min(2, 'Le nom est requis.'),
  email: z.string().email('Email invalide.'),
  phoneNumber: z.string().min(9, 'Numéro de téléphone invalide.'),
  pin: z.string().regex(/^\d{4}$/, 'Le PIN doit contenir exactement 4 chiffres.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;


const AuthFormContent = ({ mode, setMode }: { mode: AuthMode, setMode: (mode: AuthMode) => void }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const loginForm = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { identifier: '', pin: '' },
    });

    const signupForm = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { firstName: '', lastName: '', email: '', phoneNumber: '', pin: '' },
    });

    const handleLogin = async (values: LoginFormValues) => {
        setIsLoading(true);
        try {
            await loginWithIdentifier(values.identifier, values.pin);
            // On success, the useUser hook in the parent will handle the UI transition
            // No need to toast success here as it creates a flash of content
        } catch (error: any) {
            toast({
                title: "Erreur de Connexion",
                description: error.message || "Une erreur est survenue.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (values: SignupFormValues) => {
        setIsLoading(true);
        try {
            await signupWithDetails(values);
            // On success, the useUser hook will handle the UI transition
        } catch (error: any) {
            toast({
                title: "Erreur d'Inscription",
                description: error.message || "Une erreur est survenue.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (mode === 'login') {
        return (
            <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                     <FormField
                        control={loginForm.control}
                        name="identifier"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>E-mail ou N° de téléphone</FormLabel>
                            <FormControl>
                                <Input placeholder="votre@email.com ou +221..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={loginForm.control}
                        name="pin"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Code PIN (4 chiffres)</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••" {...field} maxLength={4} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6" disabled={isLoading}>
                         {isLoading ? <Loader2 className="animate-spin"/> : 'Se Connecter'}
                    </Button>
                </form>
            </Form>
        );
    }

    return (
        <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={signupForm.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={signupForm.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={signupForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={signupForm.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>N° de téléphone (Alias)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={signupForm.control} name="pin" render={({ field }) => (
                    <FormItem><FormLabel>Code PIN (4 chiffres)</FormLabel><FormControl><Input type="password" maxLength={4} {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6" disabled={isLoading}>
                     {isLoading ? <Loader2 className="animate-spin"/> : "S'inscrire"}
                </Button>
            </form>
        </Form>
    );
};


export default function AuthForm() {
    const [mode, setMode] = useState<AuthMode>('login');
  
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
                    {mode === 'login' ? <LogIn className="h-8 w-8" /> : <UserPlus className="h-8 w-8" />}
                </div>
                <h1 className="text-3xl font-bold text-primary">
                    {mode === 'login' ? "Bienvenue sur Midi" : "Créez votre compte"}
                </h1>
                <p className="text-muted-foreground mt-2">
                     {mode === 'login' ? "Connectez-vous pour accéder à votre espace." : "Simple, rapide et sécurisé."}
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{mode === 'login' ? 'Connexion' : 'Inscription'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <AuthFormContent mode={mode} setMode={setMode} />
                </CardContent>
                <CardFooter>
                    <Button variant="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="w-full text-muted-foreground">
                        {mode === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    );
  };