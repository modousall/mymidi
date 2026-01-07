
"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Download, TrendingUp, Landmark, Banknote, Globe, PlusCircle, Calculator, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useTreasuryManagement, type TreasuryOperation } from '@/hooks/use-treasury-management';
import TreasuryOperationForm from './treasury-operation-form';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import dynamic from 'next/dynamic';
import { Skeleton } from './ui/skeleton';

const AdminTegSimulator = dynamic(() => import('./admin-teg-simulator'), {
  loading: () => <div className="p-8"><Skeleton className="h-64 w-full" /></div>,
  ssr: false,
});

export default function AdminCashManagement() {
    const { treasuryData, addOperation } = useTreasuryManagement();
    const [isOperationDialogOpen, setIsOperationDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const totalTreasury = useMemo(() => treasuryData.ownFunds + treasuryData.clientFunds, [treasuryData]);
    const assetDistributionData = useMemo(() => Object.entries(treasuryData.assets).map(([name, value]) => ({ name, value })), [treasuryData.assets]);
    const fundsDistributionData = useMemo(() => [
        { name: 'Fonds des Clients', value: treasuryData.clientFunds },
        { name: 'Fonds Propres', value: treasuryData.ownFunds },
    ], [treasuryData]);

    const filteredOperations = useMemo(() => {
        return treasuryData.operations.filter(op => {
            const searchMatch = op.description.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = statusFilter === 'all' || op.status === statusFilter;
            const typeMatch = typeFilter === 'all' || op.type === typeFilter;
            return searchMatch && statusMatch && typeMatch;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [treasuryData.operations, searchTerm, statusFilter, typeFilter]);

    const operationTypes = useMemo(() => [...new Set(treasuryData.operations.map(op => op.type))], [treasuryData.operations]);
    const operationStatuses = useMemo(() => [...new Set(treasuryData.operations.map(op => op.status))], [treasuryData.operations]);

     const handleExport = async () => {
        const dataToExport = treasuryData.operations.map(op => ({
            ID: op.id,
            Date: op.date,
            Type: op.type,
            De: op.from,
            A: op.to,
            Montant: op.amount,
            Statut: op.status,
            Description: op.description
        }));
        
        const Papa = (await import('papaparse')).default;
        const csv = Papa.unparse(dataToExport, { header: true });
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `grand_livre_midi.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          const data = payload[0];
          return (
            <div className="p-2 text-sm bg-background border rounded-lg shadow-lg">
              <p className="font-bold">{`${data.name}`}</p>
              <p style={{ color: data.payload.fill }}>{`${formatCurrency(data.value)}`}</p>
            </div>
          );
        }
        return null;
    };
    
    const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestion de Trésorerie</CardTitle>
                    <CardDescription>Vue d'ensemble des actifs et des opérations de trésorerie de Midi.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Trésorerie Totale</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totalTreasury)}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Fonds des Clients</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(treasuryData.clientFunds)}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Fonds Propres</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(treasuryData.ownFunds)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ratio Fonds Propres</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{((treasuryData.ownFunds / totalTreasury) * 100).toFixed(2)}%</div></CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Répartition de la Trésorerie</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={fundsDistributionData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={p => `${(p.percent * 100).toFixed(0)}%`}>
                                    {fundsDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Répartition des Actifs</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={assetDistributionData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={p => `${(p.percent * 100).toFixed(0)}%`}>
                                    {assetDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                 </Card>
            </div>
            
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <CardTitle>Grand Livre des Opérations de Trésorerie</CardTitle>
                            <CardDescription>Suivi des mouvements de fonds internes et avec les partenaires.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Rechercher..." 
                                    className="pl-8 w-32"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon"><Filter className="h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                     <DropdownMenuLabel>Type d'opération</DropdownMenuLabel>
                                     <DropdownMenuSeparator />
                                     <DropdownMenuRadioGroup value={typeFilter} onValueChange={setTypeFilter}>
                                        <DropdownMenuRadioItem value="all">Tous</DropdownMenuRadioItem>
                                        {operationTypes.map(type => <DropdownMenuRadioItem key={type} value={type}>{type}</DropdownMenuRadioItem>)}
                                    </DropdownMenuRadioGroup>
                                    <DropdownMenuLabel>Statut</DropdownMenuLabel>
                                     <DropdownMenuSeparator />
                                     <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                                        <DropdownMenuRadioItem value="all">Tous</DropdownMenuRadioItem>
                                        {operationStatuses.map(status => <DropdownMenuRadioItem key={status} value={status}>{status}</DropdownMenuRadioItem>)}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><Calculator className="mr-2"/>Simulateur TEG</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl h-[90vh]">
                                    <AdminTegSimulator/>
                                </DialogContent>
                            </Dialog>
                            <Dialog open={isOperationDialogOpen} onOpenChange={setIsOperationDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2"/> Nouvelle Opération</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Nouvelle Opération de Trésorerie</DialogTitle>
                                    </DialogHeader>
                                    <TreasuryOperationForm
                                        treasuryData={treasuryData}
                                        onAddOperation={(op) => {
                                            addOperation(op);
                                            setIsOperationDialogOpen(false);
                                        }}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>De</TableHead>
                                <TableHead>À</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {filteredOperations.map(op => (
                                 <Dialog key={op.id}>
                                    <DialogTrigger asChild>
                                        <TableRow className="cursor-pointer">
                                            <TableCell>{op.date}</TableCell>
                                            <TableCell><Badge variant="secondary">{op.type}</Badge></TableCell>
                                            <TableCell>{op.from}</TableCell>
                                            <TableCell>{op.to}</TableCell>
                                            <TableCell className="text-muted-foreground">{op.description}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(op.amount)}</TableCell>
                                            <TableCell>
                                                <Badge variant={op.status === 'Terminé' ? 'default' : 'outline'} className={op.status === 'Terminé' ? 'bg-green-100 text-green-800' : ''}>
                                                    {op.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Détail de l'opération</DialogTitle>
                                            <DialogDescription>ID: {op.id}</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-3 py-4 text-sm border-t border-b">
                                            <div className="flex justify-between"><span>Date:</span><span>{op.date}</span></div>
                                            <div className="flex justify-between"><span>Type:</span><span>{op.type}</span></div>
                                            <div className="flex justify-between"><span>De:</span><span>{op.from}</span></div>
                                            <div className="flex justify-between"><span>À:</span><span>{op.to}</span></div>
                                            <div className="flex justify-between"><span>Montant:</span><span className="font-bold">{formatCurrency(op.amount)}</span></div>
                                            <div className="flex justify-between"><span>Statut:</span><span>{op.status}</span></div>
                                            <div className="flex flex-col pt-2"><span>Description:</span><p className="text-muted-foreground">{op.description}</p></div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </TableBody>
                    </Table>
                     {filteredOperations.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">Aucune opération ne correspond à vos filtres.</div>
                    )}
                </CardContent>
                 <CardFooter className="justify-end">
                    <Button variant="outline" onClick={handleExport}><Download className="mr-2"/> Exporter le Grand Livre</Button>
                </CardFooter>
            </Card>

        </div>
    );
