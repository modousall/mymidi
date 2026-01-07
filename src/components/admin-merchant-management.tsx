

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Search, PlusCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "./ui/input";
import AdminUserDetail from "./admin-user-detail";
import { TransactionsProvider } from "@/hooks/use-transactions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import AdminCreateUserForm from "./admin-create-user-form";
import { formatCurrency } from "@/lib/utils";
// Note: useUserManagement is removed, data needs to come from a new source e.g. a global user provider or API call
// For now, we will mock or disable functionality that depends on the full user list.

const roleVariantMap: {[key: string]: 'default' | 'secondary' | 'destructive' | 'outline'} = {
    merchant: 'default',
};

export default function AdminMerchantManagement() {
    // MOCK DATA: Replace with actual data fetching logic
    const users: any[] = []; 
    const refreshUsers = () => console.log("Refreshing users...");

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const filteredMerchants = useMemo(() => {
        return users.filter(user => 
            user.role === 'merchant' &&
            (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.merchantCode && user.merchantCode.toLowerCase().includes(searchTerm.toLowerCase())))
        );
    }, [users, searchTerm]);
    
    const handleUserSelect = (user: any) => {
        setSelectedUser(user);
    }
    
    const handleBackToList = () => {
        setSelectedUser(null);
        refreshUsers();
    }
    
    const handleUserCreated = () => {
        setIsCreateDialogOpen(false);
        refreshUsers();
    }

    if (selectedUser) {
        return <AdminUserDetail user={selectedUser} onBack={handleBackToList} onUpdate={refreshUsers} />
    }
    
    // This is a placeholder for a central admin alias to provider transaction context
    const adminAlias = "+221775478575";

    return (
        <TransactionsProvider alias={adminAlias}>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gestion des Marchands ({filteredMerchants.length})</CardTitle>
                            <CardDescription>Consultez la liste des marchands. Cliquez pour voir les détails et les transactions.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Rechercher un marchand..." 
                                    className="pl-8 w-48"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <PlusCircle className="mr-2"/> Ajouter un marchand
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Créer un nouveau marchand</DialogTitle>
                                    </DialogHeader>
                                    <AdminCreateUserForm onUserCreated={handleUserCreated} allowedRoles={['merchant']} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Marchand</TableHead>
                                <TableHead>Code Marchand</TableHead>
                                <TableHead>Solde</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredMerchants.map(user => (
                                <TableRow key={user.alias} onClick={() => handleUserSelect(user)} className="cursor-pointer">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.merchantCode}</TableCell>
                                    <TableCell>{formatCurrency(user.balance)}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.isSuspended ? "destructive" : "default"} className={!user.isSuspended ? "bg-green-100 text-green-800" : ""}>
                                            {user.isSuspended ? "Suspendu" : "Actif"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    {filteredMerchants.length === 0 && (
                        <div className="text-center p-8">
                            <p>Aucun marchand ne correspond à votre recherche.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TransactionsProvider>
    )
}
