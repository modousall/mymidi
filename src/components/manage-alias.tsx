
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Trash2, Edit } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"

type ManageAliasProps = {
  alias: string;
  onLogout: () => void;
};

export default function ManageAlias({ alias, onLogout }: ManageAliasProps) {
  const { toast } = useToast();
  const [currentAlias, setCurrentAlias] = useState(alias);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAlias = () => {
    setIsDeleting(true);
    // This action is very destructive and in a real app would require more steps.
    // For this prototype, it will log out, which effectively "deletes" the session.
    setTimeout(() => {
        toast({
            title: "Compte supprimé (simulation)",
            description: "Votre compte a été supprimé de cet appareil.",
        });
        onLogout(); 
        setIsDeleting(false);
    }, 1500);
  };
  
  const handleSaveAlias = () => {
      // In a real app, this is very complex. You'd need to migrate all data
      // from the old alias key to the new one. For this prototype, we will
      // disallow changing the alias.
      toast({
          title: "Fonctionnalité non disponible",
          description: "La modification de l'alias n'est pas autorisée dans ce prototype.",
          variant: "destructive",
      });
      setCurrentAlias(alias); // Reset to original alias
      setIsEditing(false);
  }

  const handleCopyAlias = () => {
    navigator.clipboard.writeText(alias);
    toast({
        title: "Copié !",
        description: "Votre alias a été copié dans le presse-papiers.",
    });
  }

  return (
    <div>
        <h2 className="text-2xl font-bold mb-4 text-primary">Gérer votre alias</h2>
        <p className="text-muted-foreground mb-6">Affichez, modifiez, copiez ou supprimez votre alias Midi existant.</p>
      
      <Card className="max-w-lg mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="text-primary"/>
            Votre Alias Actif
          </CardTitle>
          <CardDescription>
            C'est l'identifiant que les autres peuvent utiliser pour vous envoyer de l'argent.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <Label htmlFor="current-alias">Alias</Label>
                <div className="flex gap-2">
                    <Input id="current-alias" value={currentAlias} readOnly={!isEditing} onChange={(e) => setCurrentAlias(e.target.value)} />
                    {!isEditing ? (
                        <>
                            <Button onClick={handleCopyAlias} variant="outline">Copier</Button>
                            <Button onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4"/>Modifier</Button>
                        </>
                    ) : (
                         <Button onClick={handleSaveAlias} className='bg-accent text-accent-foreground'>Sauvegarder</Button>
                    )}
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4 border-t pt-6 mt-6">
            <h3 className="font-semibold text-destructive">Zone de Danger</h3>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer le compte
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. La suppression de votre compte effacera toutes vos données de cet appareil et vous devrez vous réinscrire.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAlias} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? "Suppression..." : "Oui, supprimer le compte"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground">
                La suppression de votre compte vous déconnectera.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
