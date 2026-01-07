
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';

const userSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
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

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: { name: "", email: "", alias: "", merchantCode: "", pincode: "", role: allowedRoles[0] },
    });

    const isMerchant = form.watch('role') === 'merchant';

    const onSubmit = async (values: UserFormValues) => {
        // This is a simplified creation for admins. We're creating a Firebase Auth user
        // but not a full Firestore profile, which is typically created on user onboarding.
        // A more robust system would use Firebase Functions to create the full user profile.
        try {
            const password = `${values.pincode}${values.pincode}`; // Demo password logic
            await createUserWithEmailAndPassword(auth, values.email, password);
             toast({
                title: "Utilisateur Créé",
                description: `Le compte pour ${values.name} a été créé dans Firebase Auth.`
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
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nom complet</FormLabel>
                            <FormControl><Input placeholder="ex: Jane Doe" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
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
