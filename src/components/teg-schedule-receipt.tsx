
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { formatCurrency } from '@/lib/utils';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

type ScheduleRow = {
    number: number;
    date: string;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
}

type TegScheduleReceiptProps = {
    params: {
        loanAmount: number;
        duration: number;
        periodicity: string;
        firstInstallmentDate: Date;
        annualTeg: number;
    };
    results: {
        installmentAmount: number;
        totalCost: number;
        schedule: ScheduleRow[];
    }
}

const TegScheduleReceipt = React.forwardRef<HTMLDivElement, TegScheduleReceiptProps>(({ params, results }, ref) => {
    return (
        <div ref={ref} style={{ fontFamily: 'sans-serif', color: '#333', fontSize: '12px', padding: '20px', width: '800px', background: 'white' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                 <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', background: 'linear-gradient(to right, hsl(197, 76%, 53%), hsl(33, 94%, 61%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0' }}>
                    Midi
                </h1>
                <p style={{ color: '#666', marginTop: '4px' }}>Plan d'Amortissement Prévisionnel</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', padding: '16px', border: '1px solid #eee', borderRadius: '8px' }}>
                <div><strong>Montant du Prêt:</strong> {formatCurrency(params.loanAmount)}</div>
                <div><strong>Échéance:</strong> {formatCurrency(results.installmentAmount)}</div>
                <div><strong>Durée:</strong> {params.duration} {params.periodicity}</div>
                <div><strong>Coût du Crédit:</strong> {formatCurrency(results.totalCost)}</div>
                <div><strong>TEG Annuel:</strong> {params.annualTeg.toFixed(2)}%</div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead style={{textAlign: 'right'}}>Échéance</TableHead>
                        <TableHead style={{textAlign: 'right'}}>Principal</TableHead>
                        <TableHead style={{textAlign: 'right'}}>Intérêts</TableHead>
                        <TableHead style={{textAlign: 'right'}}>Solde Restant</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.schedule.map(row => (
                        <TableRow key={row.number}>
                            <TableCell>{row.number}</TableCell>
                            <TableCell>{row.date}</TableCell>
                            <TableCell style={{textAlign: 'right'}}>{formatCurrency(row.payment)}</TableCell>
                            <TableCell style={{textAlign: 'right'}}>{formatCurrency(row.principal)}</TableCell>
                            <TableCell style={{textAlign: 'right'}}>{formatCurrency(row.interest)}</TableCell>
                            <TableCell style={{textAlign: 'right', fontWeight: 'bold'}}>{formatCurrency(row.balance)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '10px', color: '#999' }}>
                <p>Ce document est une simulation et n'a pas de valeur contractuelle.</p>
                <p>Généré le {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
        </div>
    );
});

TegScheduleReceipt.displayName = 'TegScheduleReceipt';
export default TegScheduleReceipt;

    