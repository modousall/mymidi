
"use client";

import { useMemo, useState } from 'react';
import { useBnpl } from '@/hooks/use-bnpl';
import type { BnplRequest, BnplStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Check, X, Hourglass, Search, Percent, Landmark } from 'lucide-react';
import { Input } from './ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AdminUserDetail from './admin-user-detail';
import { useUserManagement, type ManagedUserWithDetails } from '@/hooks/use-user-management';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import CreditRequestDetails from './credit-request-details';
import { formatCurrency } from '@/lib/utils';


const formatDate = (dateString: string) => format(new Date(dateString), 'Pp', { locale: fr });

const statusConfig: Record<BnplStatus, { text: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: JSX.Element }> = {
    'review': { text: "Examen Requis", badgeVariant: "outline", icon: <Hourglass className="h-4 w-4" /> },
    'approved': { text: "Approuvée", badgeVariant: "default", icon: <Check className="h-4 w-4" /> },
    'rejected': { text: "Rejetée", badgeVariant: "destructive", icon: <X className="h-4 w-4" /> },
};


export default function AdminBnplManagement() {
    const { allRequests, updateRequestStatus, kpis } = useBnpl();
    const [searchTerm, setSearchTerm] = useState('');
    const { users, refreshUsers } = useUserManagement();
    const [selectedUser, setSelectedUser] = useState<ManagedUserWithDetails | null>(null);

    const filteredRequests = useMemo(() => {
        return allRequests.filter(req => 
            req.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.merchantAlias.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [allRequests, searchTerm]);

    const handleUpdateRequest = (id: string, status: 'approved' | 'rejected') => {
        updateRequestStatus(id, status);
    };

    const handleUserSelect = (alias: string) => {
        const userToView = users.find(u => u.alias === alias);
        if (userToView) {
            setSelectedUser(userToView);
        }
    }

    if (selectedUser) {
        return <AdminUserDetail user={selectedUser} onBack={() => setSelectedUser(null)} onUpdate={refreshUsers} />;
    }


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Moteur de Décision - Crédit Marchands (BNPL)</CardTitle>
                    <CardDescription>
                        Examinez les demandes de crédit, approuvez ou rejetez. Les décisions automatiques sont déjà appliquées.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2"><Landmark/>Montant Total Approuvé</CardTitle>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(kpis.totalApprovedAmount)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2"><Hourglass/>Demandes pour Comité</CardTitle>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{kpis.pendingRequests}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2"><Percent/>Taux d'Approbation</CardTitle>
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{kpis.approvalRate.toFixed(1)}%</div></CardContent>
                </Card>
            </div>


            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Dossiers de Crédit</CardTitle>
                            <CardDescription>
                                Liste complète de toutes les demandes de crédit.
                            </CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Rechercher par alias..." 
                                className="pl-8 w-48"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Marchand</TableHead>
                                <TableHead>Montant</TableHead>
                                <TableHead>Justification Moteur de Décision</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRequests.map(req => (
                                <Dialog key={req.id}>
                                    <DialogTrigger asChild>
                                        <TableRow className="cursor-pointer">
                                            <TableCell>{formatDate(req.requestDate)}</TableCell>
                                            <TableCell>
                                                <Button variant="link" className="p-0 h-auto" onClick={(e) => {e.stopPropagation(); handleUserSelect(req.alias);}}>
                                                {req.alias}
                                                </Button>
                                            </TableCell>
                                            <TableCell>{req.merchantAlias}</TableCell>
                                            <TableCell>{formatCurrency(req.amount)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{req.reason}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusConfig[req.status].badgeVariant} className="gap-1">
                                                    {statusConfig[req.status].icon} {statusConfig[req.status].text}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {req.status === 'review' && (
                                                    <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                                                        <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleUpdateRequest(req.id, 'approved')}>
                                                            <Check className="mr-1" size={16}/> Approuver
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleUpdateRequest(req.id, 'rejected')}>
                                                            <X className="mr-1" size={16}/> Rejeter
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </DialogTrigger>
                                     <DialogContent className="max-w-2xl">
                                        <CreditRequestDetails request={req} />
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredRequests.length === 0 && (
                        <div className="text-center p-8">
                            <p>Aucune demande de crédit à afficher.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
