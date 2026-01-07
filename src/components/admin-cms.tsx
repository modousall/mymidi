
"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCms, type CmsContent } from '@/hooks/use-cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import React, { useRef } from 'react';
import { UploadCloud, Trash2 } from 'lucide-react';

const pageFeatureItemSchema = z.object({
    title: z.string().min(1, "Le titre est requis."),
    description: z.string().min(1, "La description est requise."),
});

const cmsSchema = z.object({
    hero: z.object({
        title: z.string().min(1, "Le titre est requis."),
        subtitle: z.string().min(1, "Le sous-titre est requis."),
        description: z.string().min(1, "La description est requise."),
    }),
    features: z.array(z.object({
        id: z.string(),
        href: z.string(),
        title: z.string().min(1, "Le titre de la carte est requis."),
        description: z.string().min(1, "La description de la carte est requise."),
    })),
    images: z.object({
        financing: z.string().min(1, "L'URL est requise.").url("L'URL de l'image de financement est invalide ou vide.").or(z.string().startsWith("data:image/")),
        savings: z.string().min(1, "L'URL est requise.").url("L'URL de l'image d'épargne est invalide ou vide.").or(z.string().startsWith("data:image/")),
        payments: z.string().min(1, "L'URL est requise.").url("L'URL de l'image de paiements est invalide ou vide.").or(z.string().startsWith("data:image/")),
        security: z.string().min(1, "L'URL est requise.").url("L'URL de l'image de sécurité est invalide ou vide.").or(z.string().startsWith("data:image/")),
    }),
    pageFeatures: z.object({
        financing: z.array(pageFeatureItemSchema),
        savings: z.array(pageFeatureItemSchema),
        payments: z.array(pageFeatureItemSchema),
        security: z.array(pageFeatureItemSchema),
    }),
});

const ImageUploadField = ({ form, name, label }: { form: any, name: `images.${'financing' | 'savings' | 'payments' | 'security'}`, label: string }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                form.setValue(name, reader.result as string, { shouldValidate: true });
                toast({ title: "Image chargée", description: "L'image a été convertie en Data URL." });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormDescription>Dimensions recommandées : 600x400px.</FormDescription>
                    <div className="flex gap-2">
                        <FormControl>
                            <Input placeholder="https://... ou data:image/..." {...field} />
                        </FormControl>
                         <Button type="button" variant="outline" onClick={triggerFileSelect}>
                           <UploadCloud className="mr-2"/> Téléverser
                        </Button>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

type PageFeatureEditorProps = {
    form: any;
    pageName: 'financing' | 'savings' | 'payments' | 'security';
    title: string;
};

const PageFeatureEditor = ({ form, pageName, title }: PageFeatureEditorProps) => {
    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: `pageFeatures.${pageName}`
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-md space-y-2 relative">
                        <FormField
                            control={form.control}
                            name={`pageFeatures.${pageName}.${index}.title`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Titre</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`pageFeatures.${pageName}.${index}.description`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ title: '', description: '' })}>
                    Ajouter un point
                </Button>
            </CardContent>
        </Card>
    );
};

export default function AdminCms() {
    const { content, setContent } = useCms();

    const form = useForm<CmsContent>({
        resolver: zodResolver(cmsSchema),
        values: content,
        resetOptions: {
            keepDirtyValues: true,
        }
    });
    
    const { fields: featureFields } = useFieldArray({
        control: form.control,
        name: "features",
    });

    const onSubmit = (data: CmsContent) => {
        setContent(data);
        toast({
            title: "Contenu mis à jour",
            description: "Les modifications ont été enregistrées.",
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Gestion du Contenu de la Plateforme</CardTitle>
                        <CardDescription>Modifiez les textes et les images affichés sur l'ensemble de la plateforme.</CardDescription>
                    </CardHeader>
                </Card>
                <Tabs defaultValue="landing" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="landing">Page d'Accueil</TabsTrigger>
                        <TabsTrigger value="pages">Pages de Services</TabsTrigger>
                        <TabsTrigger value="images">Images Globales</TabsTrigger>
                    </TabsList>

                    <TabsContent value="landing" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Section Héro</CardTitle>
                                <CardDescription>Le contenu principal en haut de la page d'accueil.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="hero.title" render={({ field }) => (
                                    <FormItem><FormLabel>Titre Principal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="hero.subtitle" render={({ field }) => (
                                    <FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="hero.description" render={({ field }) => (
                                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Cartes de Fonctionnalités</CardTitle>
                                <CardDescription>Les quatre cartes de fonctionnalités sur la page d'accueil.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {featureFields.map((field, index) => (
                                    <div key={field.id} className="space-y-4 p-4 border rounded-md">
                                        <h4 className="font-semibold text-lg capitalize">{field.id}</h4>
                                        <FormField control={form.control} name={`features.${index}.title`} render={({ field }) => (
                                            <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`features.${index}.description`} render={({ field }) => (
                                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="pages" className="mt-6 space-y-6">
                        <PageFeatureEditor form={form} pageName="financing" title="Page Financement" />
                        <PageFeatureEditor form={form} pageName="savings" title="Page Épargne" />
                        <PageFeatureEditor form={form} pageName="payments" title="Page Paiements" />
                        <PageFeatureEditor form={form} pageName="security" title="Page Sécurité" />
                    </TabsContent>

                    <TabsContent value="images" className="mt-6">
                        <Card>
                             <CardHeader>
                                <CardTitle>Images des Pages de Détails</CardTitle>
                                <CardDescription>Changez les images d'illustration pour chaque page de fonctionnalité.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                               <ImageUploadField form={form} name="images.financing" label="Page Financement" />
                               <ImageUploadField form={form} name="images.savings" label="Page Épargne" />
                               <ImageUploadField form={form} name="images.payments" label="Page Paiements" />
                               <ImageUploadField form={form} name="images.security" label="Page Sécurité" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                
                <div className="flex justify-end">
                    <Button type="submit">Enregistrer les modifications</Button>
                </div>
            </form>
        </Form>
    );
}
