
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Search, PlusCircle, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "./ui/input";
import AdminUserDetail from "./admin-user-detail";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import AdminCreateUserForm from "./admin-create-user-form";
import { TransactionsProvider } from "@/hooks/use-transactions";
import { formatCurrency } from "@/lib/utils";
import type { ManagedUser } from "@/lib/types";


const roleVariantMap: {[key: string]: 'default' | 'secondary' | 'destructive' | 'outline'} = {
    superadmin: 'destructive',
    admin: 'destructive',
    support: 'secondary',
    merchant: 'default',
    agent: 'default',
    user: 'outline',
    "agent de crédit": 'secondary',
    "agent de conformité": 'secondary',
    "guichetier": 'secondary',
    "responsable agence": 'secondary',
};

type AdminUserManagementProps = {
    allUsers: ManagedUser[];
    refreshUsers: () => void;
}

export default function AdminUserManagement({ allUsers, refreshUsers }: AdminUserManagementProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const filteredUsers = useMemo(() => {
        return allUsers.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.alias.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allUsers, searchTerm]);
    
    const handleUserSelect = (user: any) => {
        setSelectedUser(user);
    }
    
    const handleBackToList = () => {
        setSelectedUser(null);
        refreshUsers(); // Refresh the list after an update
    }
    
    const handleUserCreated = () => {
        setIsCreateDialogOpen(false);
        refreshUsers();
    }

    if (selectedUser) {
        return (
            <TransactionsProvider alias={selectedUser.alias}>
                <AdminUserDetail user={selectedUser} onBack={handleBackToList} onUpdate={handleBackToList} />
            </TransactionsProvider>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Gestion des Utilisateurs ({filteredUsers.length})</CardTitle>
                        <CardDescription>Consultez la liste des clients et du personnel interne. Cliquez pour voir les détails.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Rechercher..." 
                                className="pl-8 w-48"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2"/> Créer un utilisateur
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Créer un nouvel utilisateur interne</DialogTitle>
                                </DialogHeader>
                                <AdminCreateUserForm onUserCreated={handleUserCreated} allowedRoles={['support', 'admin', 'merchant']} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 {allUsers.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin h-8 w-8" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Identifiant</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Solde Principal</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredUsers.map(user => (
                                <TableRow key={user.alias} onClick={() => handleUserSelect(user)} className="cursor-pointer">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                {/* Avatar handling needs to be adapted for Firestore */}
                                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                                                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.role === 'merchant' ? (
                                            <Badge variant="outline">{user.merchantCode}</Badge>
                                        ) : (
                                            user.alias
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={roleVariantMap[user.role?.toLowerCase() || 'user'] || 'outline'}>{user.role || 'user'}</Badge>
                                    </TableCell>
                                    <TableCell>{formatCurrency(user.balance || 0)}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.isSuspended ? "destructive" : "default"} className={!user.isSuspended ? "bg-green-100 text-green-800" : ""}>
                                            {user.isSuspended ? "Suspendu" : "Actif"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                )}
                {allUsers.length > 0 && filteredUsers.length === 0 && (
                    <div className="text-center p-8">
                        <p>Aucun utilisateur ne correspond à votre recherche.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
