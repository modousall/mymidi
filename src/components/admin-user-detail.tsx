

"use client"

import { useState, useMemo, useRef } from 'react';
import { Button } from "./ui/button";
import { ArrowLeft, User, TrendingUp, CreditCard, ShieldCheck, KeyRound, UserX, UserCheck, Ban, Wallet, Settings, Users as TontineIcon, Clock, Briefcase, PiggyBank, Eye, EyeOff, X, Edit, HandCoins, Check, Building, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import TransactionHistory from './transaction-history';
import { FeatureFlagProvider } from '@/hooks/use-feature-flags';
import { AvatarProvider } from '@/hooks/use-avatar';
import { BalanceProvider } from '@/hooks/use-balance';
import { ContactsProvider } from '@/hooks/use-contacts';
import { VirtualCardProvider } from '@/hooks/use-virtual-card';
import { VaultsProvider } from '@/hooks/use-vaults';
import { TontineProvider } from '@/hooks/use-tontine';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useBnpl, BnplProvider } from '@/hooks/use-bnpl';
import type { BnplRequest, BnplStatus, ManagedUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CreditRequestDetails from './credit-request-details';
import { formatCurrency } from '@/lib/utils';
import { updateDoc, doc } from 'firebase/firestore';
import type { Transaction } from '@/hooks/use-transactions';
import { TransactionsProvider } from '@/hooks/use-transactions';


// Import product components
import Vaults from './vaults';
import Tontine from './tontine';
import VirtualCard from './virtual-card';

const RoleManagementDialog = ({ user, onClose, onUpdate }: { user: any, onClose: () => void, onUpdate: (id: string, data: Partial<ManagedUser>) => void }) => {
    const [selectedRole, setSelectedRole] = useState(user.role);
    const { toast } = useToast();
    
    const handleSaveRole = async () => {
        // This is a simulation. In a real app this would call a secure backend function.
        onUpdate(user.id, { role: selectedRole });
        toast({
            title: "Rôle mis à jour (simulation)",
            description: `Le rôle de ${user.firstName} a été changé en "${selectedRole}".`
        });
        onClose();
    };

    const availableRoles = ['user', 'merchant', 'support', 'admin'];

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Gérer le rôle de {user.firstName} {user.lastName}</DialogTitle>
                <DialogDescription>
                    La modification du rôle changera les accès et l'interface de l'utilisateur.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="role-select">Nouveau rôle</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger id="role-select">
                        <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableRoles.map(role => (
                            <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
                <Button onClick={handleSaveRole}>Sauvegarder le rôle</Button>
            </DialogFooter>
        </DialogContent>
    );
};


const ResetPinDialog = ({ user, onClose }: { user: any, onClose: () => void }) => {
    const [newPin, setNewPin] = useState("");
    const { toast } = useToast();
    
    const handleReset = async () => {
        if(newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            toast({
                title: "Code PIN invalide",
                description: "Le code PIN doit contenir exactement 4 chiffres.",
                variant: "destructive"
            });
            return;
        }
        
        // This is a sensitive operation. In a real app, this would be an admin SDK call on the backend.
        // We simulate the frontend part of this action.
        console.log(`SIMULATION: An admin function would be called to reset the password for user ${user.id} using the new PIN: ${newPin}.`);
        
        toast({
            title: "Réinitialisation du PIN (Simulation)",
            description: `Le PIN pour ${user.firstName} a été mis à jour. L'utilisateur devra être informé du nouveau code pour se connecter.`
        });
        
        onClose();
    }
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Réinitialiser le PIN de {user.firstName} {user.lastName}</DialogTitle>
                <DialogDescription>
                    Entrez un nouveau code PIN à 4 chiffres pour cet utilisateur. L'utilisateur devra être informé de ce changement.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="new-pin">Nouveau Code PIN</Label>
                <Input
                    id="new-pin"
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    maxLength={4}
                    placeholder="••••"
                    className="text-center tracking-widest text-lg"
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Annuler</Button>
                </DialogClose>
                <Button onClick={handleReset}>Réinitialiser</Button>
            </DialogFooter>
        </DialogContent>
    )
}

const UserServiceProvider = ({ user, children }: { user: ManagedUser, children: React.ReactNode }) => {
    return (
        <FeatureFlagProvider>
            <AvatarProvider alias={user.alias}>
                <TransactionsProvider forUserId={user.id}>
                    <BalanceProvider alias={user.alias}>
                        <BnplProvider alias={user.alias}>
                            <ContactsProvider alias={user.alias}>
                                <VirtualCardProvider alias={user.alias}>
                                    <VaultsProvider alias={user.alias}>
                                        <TontineProvider alias={user.alias}>
                                            {children}
                                        </TontineProvider>
                                    </VaultsProvider>
                                </VirtualCardProvider>
                            </ContactsProvider>
                        </BnplProvider>
                    </BalanceProvider>
                </TransactionsProvider>
            </AvatarProvider>
        </FeatureFlagProvider>
    )
};

const SummaryCard = ({ title, balance, icon, color, onClick, isCurrency = true }: { title: string, balance: number, icon: JSX.Element, color: string, onClick?: () => void, isCurrency?: boolean }) => (
    <Card 
      className={`text-white shadow-lg p-3 flex flex-col justify-between bg-gradient-to-br ${color} border-none ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      onClick={onClick}
    >
        <div className="flex justify-between items-start">
            <p className="font-semibold text-sm">{title}</p>
            {icon}
        </div>
        <div className="text-right mt-2">
            <p className="text-xl font-bold tracking-tight">{isCurrency ? formatCurrency(balance) : balance.toLocaleString()}</p>
        </div>
    </Card>
);

type ActiveServiceView = 'transactions' | 'ma-carte' | 'coffres' | 'tontine' | 'credit-details';

const formatDate = (dateString: string) => format(new Date(dateString), 'Pp', { locale: fr });
const statusConfig: Record<BnplStatus, { text: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: JSX.Element }> = {
    'review': { text: "En attente", badgeVariant: "outline", icon: <Clock className="h-4 w-4" /> },
    'approved': { text: "Approuvée", badgeVariant: "default", icon: <Check className="h-4 w-4" /> },
    'rejected': { text: "Rejetée", badgeVariant: "destructive", icon: <X className="h-4 w-4" /> },
};


const MerchantCreditDetails = ({ requests }: { requests: BnplRequest[] }) => (
     <Card>
        <CardHeader>
            <CardTitle>Historique des Crédits Marchands</CardTitle>
            <CardDescription>Liste des crédits accordés aux clients par ce marchand.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {requests.map(req => (
                    <Dialog key={req.id}>
                        <DialogTrigger asChild>
                            <TableRow className="cursor-pointer">
                                <TableCell>{formatDate(req.requestDate)}</TableCell>
                                <TableCell>{req.alias}</TableCell>
                                <TableCell>{formatCurrency(req.amount)}</TableCell>
                                <TableCell>
                                    <Badge variant={statusConfig[req.status].badgeVariant} className="gap-1">
                                        {statusConfig[req.status].icon} {statusConfig[req.status].text}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        </DialogTrigger>
                        <DialogContent>
                            <CreditRequestDetails request={req} />
                        </DialogContent>
                    </Dialog>
                ))}
                </TableBody>
            </Table>
            {requests.length === 0 && <p className="text-center p-4 text-muted-foreground">Aucun crédit en cours pour ce marchand.</p>}
        </CardContent>
    </Card>
)


export default function AdminUserDetail({ user, onBack, onUpdate }: { user: ManagedUser, onBack: () => void, onUpdate: (id: string, data: Partial<ManagedUser>) => void }) {
    const { toast } = useToast();
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [activeServiceView, setActiveServiceView] = useState<ActiveServiceView>('transactions');
    const transactionHistoryRef = useRef<HTMLDivElement>(null);
    

    const todaysRevenue = 0; // Simulated
    const todaysTransactionsCount = 0; // Simulated
    
    const { allRequests } = useBnpl();
    
    const merchantCreditToCustomers = useMemo(() => {
        return allRequests
            .filter(req => req.merchantAlias === user.alias && req.status === 'approved')
            .reduce((total, req) => total + (req.amount - (req.repaidAmount || 0)), 0);
    }, [allRequests, user.alias]);
    
    const merchantCredits = useMemo(() => {
        return allRequests.filter(req => req.merchantAlias === user.alias);
    }, [allRequests, user.alias]);


    const totalVaultsBalance = useMemo(() => (user as any).vaults?.reduce((acc: number, vault: any) => acc + vault.balance, 0) || 0, [user]);
    const totalTontinesBalance = useMemo(() => (user as any).tontines?.reduce((acc: number, tontine: any) => acc + (tontine.amount * tontine.participants.length), 0) || 0, [user]);
    const virtualCardBalance = useMemo(() => (user as any).virtualCard?.balance ?? 0, [user]);

    const handleToggleSuspension = async () => {
        const newSuspensionState = !user.isSuspended;
        onUpdate(user.id, { isSuspended: newSuspensionState });
        toast({
            title: `Utilisateur ${newSuspensionState ? 'suspendu' : 'réactivé'}`,
            description: `${user.firstName} a été ${newSuspensionState ? 'suspendu' : 'réactivé'}.`
        });
    }
    
    const handleScrollToTransactions = () => {
        setActiveServiceView('transactions');
        transactionHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    
    const renderServiceView = () => {
        switch (activeServiceView) {
            case 'transactions':
                return <TransactionHistory showAll={true} onShowAll={() => {}} />;
            case 'ma-carte':
                return <VirtualCard onBack={() => setActiveServiceView('transactions')} cardHolderName={`${user.firstName} ${user.lastName}`} />;
            case 'coffres':
                return <Vaults onBack={() => setActiveServiceView('transactions')} />;
            case 'tontine':
                return <Tontine onBack={() => setActiveServiceView('transactions')} />;
            case 'credit-details':
                 if(user.role === 'merchant') {
                    return <MerchantCreditDetails requests={merchantCredits} />;
                }
                return <TransactionHistory showAll={true} onShowAll={() => {}} />; // Fallback for non-merchants
            default:
                return <TransactionHistory showAll={true} onShowAll={() => {}} />;
        }
    }

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();


    return (
         <UserServiceProvider user={user}>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button onClick={onBack} variant="outline" size="icon">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">Détail de l'utilisateur</h2>
                        <p className="text-muted-foreground">Vue d'ensemble du compte de {userName}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={user.avatar ?? undefined} alt={userName} />
                                    <AvatarFallback>{user.firstName?.charAt(0) ?? 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-xl">{userName}</CardTitle>
                                    <CardDescription>{user.alias}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email</span>
                                    <span>{user.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Rôle</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={user.role === 'superadmin' ? 'destructive' : 'secondary'}>{user.role}</Badge>
                                        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={user.role === 'superadmin'}>
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                            </DialogTrigger>
                                            {isRoleDialogOpen && <RoleManagementDialog user={user} onClose={() => setIsRoleDialogOpen(false)} onUpdate={onUpdate} />}
                                        </Dialog>
                                    </div>
                            </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Statut</span>
                                    <Badge variant={user.isSuspended ? "destructive" : "default"} className={!user.isSuspended ? "bg-green-100 text-green-800" : ""}>
                                        {user.isSuspended ? "Suspendu" : "Actif"}
                                    </Badge>
                            </div>
                            <div className="flex justify-between">
                                    <span className="text-muted-foreground">Solde Principal</span>
                                    <span className="font-semibold">{formatCurrency(user.balance)}</span>
                            </div>
                            {user.role === 'merchant' && (
                                <>
                                     <div className="flex justify-between pt-2 border-t"><span className="text-muted-foreground">Nom de la marque</span> <span className="font-semibold">{(user as any).brandName || "N/A"}</span></div>
                                     <div className="flex justify-between"><span className="text-muted-foreground">Code Marchand</span> <span className="font-semibold">{user.merchantCode || "N/A"}</span></div>
                                     <div className="flex justify-between"><span className="text-muted-foreground">NINEA</span> <span className="font-semibold">{(user as any).ninea || "N/A"}</span></div>
                                     <div className="flex justify-between"><span className="text-muted-foreground">RCCM</span> <span className="font-semibold">{(user as any).rccm || "N/A"}</span></div>
                                </>
                            )}
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader><CardTitle>Actions de gestion</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-2">
                                <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" disabled={user.role === 'superadmin'}>
                                            <KeyRound className="mr-2"/> Réinitialiser PIN
                                        </Button>
                                    </DialogTrigger>
                                    {isPinDialogOpen && <ResetPinDialog user={user} onClose={() => setIsPinDialogOpen(false)} />}
                                </Dialog>
                                <Button variant="destructive" onClick={handleToggleSuspension} disabled={user.role === 'superadmin'}>
                                    {user.isSuspended ? <UserCheck className="mr-2"/> : <UserX className="mr-2"/>}
                                    {user.isSuspended ? 'Réactiver' : 'Suspendre'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                         {user.role === 'user' && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <SummaryCard title="Solde Principal" balance={user.balance} icon={<Wallet className="h-5 w-5 text-white" />} color="from-primary to-blue-400" onClick={() => setActiveServiceView('transactions')} />
                                <SummaryCard title="Carte Virtuelle" balance={virtualCardBalance} icon={<CreditCard className="h-5 w-5 text-white" />} color="from-sky-500 to-cyan-400" onClick={() => setActiveServiceView('ma-carte')} />
                                <SummaryCard title="Mes Coffres" balance={totalVaultsBalance} icon={<PiggyBank className="h-5 w-5 text-white" />} color="from-amber-500 to-yellow-400" onClick={() => setActiveServiceView('coffres')} />
                                <SummaryCard title="Tontines" balance={totalTontinesBalance} icon={<TontineIcon className="h-5 w-5 text-white" />} color="from-emerald-500 to-green-400" onClick={() => setActiveServiceView('tontine')}/>
                            </div>
                        )}
                        {user.role === 'merchant' && (
                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <SummaryCard title="Chiffre d'Affaires (jour)" balance={todaysRevenue} icon={<TrendingUp className="h-5 w-5 text-white" />} color="from-primary to-blue-400" onClick={handleScrollToTransactions} />
                                <SummaryCard title="Transactions (jour)" balance={todaysTransactionsCount} icon={<Briefcase className="h-5 w-5 text-white" />} color="from-sky-500 to-cyan-400" isCurrency={false} onClick={handleScrollToTransactions} />
                                <SummaryCard title="Solde Marchand" balance={user.balance} icon={<Wallet className="h-5 w-5 text-white" />} color="from-emerald-500 to-green-400" onClick={handleScrollToTransactions} />
                                <SummaryCard title="Crédit en Cours" balance={merchantCreditToCustomers} icon={<HandCoins className="h-5 w-5 text-white" />} color="from-amber-500 to-yellow-400" onClick={() => setActiveServiceView('credit-details')} />
                            </div>
                        )}
                        <Card ref={transactionHistoryRef}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>
                                        {activeServiceView === 'transactions' && "Historique des transactions"}
                                        {activeServiceView === 'ma-carte' && "Gestion de la Carte Virtuelle"}
                                        {activeServiceView === 'coffres' && "Gestion des Coffres"}
                                        {activeServiceView === 'tontine' && "Gestion des Tontines"}
                                        {activeServiceView === 'credit-details' && `Crédits Marchands pour ${userName}`}
                                    </CardTitle>
                                    {activeServiceView !== 'transactions' && (
                                        <Button variant="ghost" size="icon" onClick={() => setActiveServiceView('transactions')}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {renderServiceView()}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </UserServiceProvider>
    )
}
