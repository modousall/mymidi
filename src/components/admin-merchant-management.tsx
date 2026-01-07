
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
import { TransactionsProvider } from "@/hooks/use-transactions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import AdminCreateUserForm from "./admin-create-user-form";
import { formatCurrency } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from 'firebase/firestore';

const roleVariantMap: {[key: string]: 'default' | 'secondary' | 'destructive' | 'outline'} = {
    merchant: 'default',
};

export default function AdminMerchantManagement() {
    const firestore = useFirestore();
    const merchantsQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('role', '==', 'merchant')), [firestore]);
    const { data: users, isLoading } = useCollection(merchantsQuery);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const filteredMerchants = useMemo(() => {
        if (!users) return [];
        return users.filter(user => 
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.merchantCode && user.merchantCode.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, searchTerm]);
    
    const handleUserSelect = (user: any) => {
        setSelectedUser(user);
    }
    
    const handleBackToList = () => {
        setSelectedUser(null);
    }
    
    const handleUserCreated = () => {
        setIsCreateDialogOpen(false);
    }

    if (selectedUser) {
        return <AdminUserDetail user={selectedUser} onBack={handleBackToList} onUpdate={() => {}} />
    }
    
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
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin h-8 w-8" />
                        </div>
                    ) : (
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
                                    <TableRow key={user.id} onClick={() => handleUserSelect(user)} className="cursor-pointer">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={user.avatar ?? undefined} alt={user.firstName} />
                                                    <AvatarFallback>{user.firstName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.merchantCode}</TableCell>
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
                    {!isLoading && filteredMerchants.length === 0 && (
                        <div className="text-center p-8">
                            <p>Aucun marchand ne correspond à votre recherche.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TransactionsProvider>
    )
}
