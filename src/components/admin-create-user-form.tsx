
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { createUserWithEmailAndPassword, useAuth, useFirestore } from '@/firebase';
import { setDoc, doc } from 'firebase/firestore';

const userSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'email est invalide."),
  alias: z.string().min(9, "Le numéro de téléphone doit être valide."),
  merchantCode: z.string().optional(),
  pincode: z.string().regex(/^\d{4}$/, "Le code PIN doit être composé de 4 chiffres."),
  role: z.enum(['support', 'admin', 'merchant'], { required_error: "Le rôle est requis." }),
}).refine(data => data.role !== 'merchant' || (data.merchantCode && data.merchantCode.length > 0), {
    message: "Le code marchand est requis pour les marchands.",
    path: ["merchantCode"],
});


type UserFormValues = z.infer<typeof userSchema>;

type AdminCreateUserFormProps = {
    onUserCreated: () => void;
    allowedRoles?: ('support' | 'admin' | 'merchant')[];
};

export default function AdminCreateUserForm({ onUserCreated, allowedRoles = ['support', 'admin'] }: AdminCreateUserFormProps) {
    const { toast } = useToast();
    const auth = useAuth();
    const firestore = useFirestore();

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: { firstName: "", lastName: "", email: "", alias: "", merchantCode: "", pincode: "", role: allowedRoles[0] },
    });

    const isMerchant = form.watch('role') === 'merchant';

    const onSubmit = async (values: UserFormValues) => {
        if (!firestore) {
            toast({ title: "Erreur", description: "Firestore n'est pas initialisé.", variant: "destructive" });
            return;
        }
        
        try {
            const password = `${values.pincode}${values.pincode}`; // Demo password logic
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, password);
            const user = userCredential.user;
            
            // Create user profile in Firestore
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                id: user.uid,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                phoneNumber: values.alias,
                alias: values.alias, // Using phone number as alias for login
                role: values.role,
                merchantCode: values.merchantCode || null,
                isSuspended: false,
                balance: 0, // Initial balance
            });

             toast({
                title: "Utilisateur Créé",
                description: `Le compte pour ${values.firstName} a été créé.`
            });
            onUserCreated();
        } catch (error: any) {
             toast({
                title: "Erreur de création",
                description: error.message || "Impossible de créer le compte.",
                variant: "destructive",
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="ex: Jane" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="ex: Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" placeholder="ex: jane@paytik.com" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rôle</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez un rôle" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {allowedRoles.map(role => (
                                        <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="alias"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>N° de téléphone (connexion)</FormLabel>
                            <FormControl><Input placeholder="+221..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {isMerchant && (
                     <FormField
                        control={form.control}
                        name="merchantCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Code Marchand (public)</FormLabel>
                                <FormControl><Input placeholder="ex: boutiqueLamine" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>PIN Initial</FormLabel>
                            <FormControl><Input type="password" maxLength={4} placeholder="••••" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end pt-4">
                     <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Création en cours..." : "Créer l'utilisateur"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
