
"use client";

import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowLeft, Wallet, CreditCard, Users, PiggyBank, Download, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import AdminUserDetail from './admin-user-detail';
import { Input } from './ui/input';
import { formatCurrency } from '@/lib/utils';
// Note: useUserManagement is removed, data needs to come from a new source e.g. a global user provider or API call
// For now, we will mock or disable functionality that depends on the full user list.

type Feature = 'mainBalance' | 'vaults' | 'virtualCards' | 'tontine';

type AdminFeatureDetailProps = {
    feature: Feature;
    onBack: () => void;
}

const featureConfig = {
    mainBalance: {
        title: "Comptes Principaux",
        icon: <Wallet />,
        description: "Liste de tous les utilisateurs et de leur solde principal.",
        getBalance: (u: any) => u.balance,
    },
    vaults: {
        title: "Coffres / Tirelires",
        icon: <PiggyBank />,
        description: "Liste des utilisateurs ayant des coffres et le solde total de leurs coffres.",
        getBalance: (u: any) => u.vaults.reduce((sum: number, v: any) => sum + v.balance, 0),
    },
    virtualCards: {
        title: "Cartes Virtuelles",
        icon: <CreditCard />,
        description: "Liste des utilisateurs possédant une carte virtuelle et son solde.",
        getBalance: (u: any) => u.virtualCard?.balance ?? 0,
    },
    tontine: {
        title: "Tontines",
        icon: <Users />,
        description: "Liste des utilisateurs participant à des tontines et la valeur totale de leurs tontines.",
        getBalance: (u: any) => u.tontines.reduce((sum: number, t: any) => sum + t.amount * t.participants.length, 0),
    }
}

export default function AdminFeatureDetail({ feature, onBack }: AdminFeatureDetailProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // MOCK DATA: Replace with actual data fetching logic
    const users: any[] = []; 
    const refreshUsers = () => console.log("Refreshing users...");

    const config = featureConfig[feature];

    const usersWithService = useMemo(() => {
        return users
            .map(user => ({
                user,
                serviceBalance: config.getBalance(user)
            }))
            .filter(item => item.serviceBalance > 0)
            .sort((a, b) => b.serviceBalance - a.serviceBalance)
            .filter(item => 
                item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.user.alias.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [users, config, searchTerm]);

    const totalServiceBalance = useMemo(() => {
        return usersWithService.reduce((sum, item) => sum + item.serviceBalance, 0);
    }, [usersWithService]);

    const handleExport = async () => {
        const dataToExport = usersWithService.map(item => ({
            Nom: item.user.name,
            Alias: item.user.alias,
            Email: item.user.email,
            Role: item.user.role,
            Solde_Service: item.serviceBalance,
        }));
        
        const Papa = (await import('papaparse')).default;
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `export_${feature}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (selectedUser) {
        return <AdminUserDetail user={selectedUser} onBack={() => setSelectedUser(null)} onUpdate={refreshUsers} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="outline" size="icon">
                    <ArrowLeft />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">{config.icon} {config.title}</h2>
                    <p className="text-muted-foreground">{config.description}</p>
                </div>
            </div>

             <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Actifs Totaux du Service</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totalServiceBalance)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Nombre d'Utilisateurs Actifs</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{usersWithService.length}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Détail par Utilisateur</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                               <Input 
                                    placeholder="Rechercher..." 
                                    className="pl-8 w-40" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleExport} variant="outline">
                                <Download className="mr-2" /> Exporter vers Excel
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead className="text-right">Solde du Service</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {usersWithService.map(item => (
                            <TableRow key={item.user.alias} onClick={() => setSelectedUser(item.user)} className="cursor-pointer">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={item.user.avatar ?? undefined} alt={item.user.name} />
                                            <AvatarFallback>{item.user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{item.user.name}</p>
                                            <p className="text-sm text-muted-foreground">{item.user.alias}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{item.user.role}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-primary">{formatCurrency(item.serviceBalance)}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    {usersWithService.length === 0 && (
                        <div className="text-center p-8">
                            <p>Aucun utilisateur à afficher pour ce service.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
