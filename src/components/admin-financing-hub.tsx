
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminBnplManagement from "./admin-bnpl-management";
import AdminFinancingManagement from "./admin-financing-management";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import AdminClientFinancingForm from "./admin-client-financing-form";
import type { ManagedUser } from '@/lib/types';


type AdminFinancingHubProps = {
    allUsers: ManagedUser[];
}

type View = 'hub' | 'create';

export default function AdminFinancingHub({ allUsers }: AdminFinancingHubProps) {
    const [view, setView] = useState<View>('hub');

    if (view === 'create') {
        return <AdminClientFinancingForm onBack={() => setView('hub')} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setView('create')}>
                    <PlusCircle className="mr-2"/> Saisir une demande client
                </Button>
            </div>
            <Tabs defaultValue="merchant" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="merchant">Financement Marchand</TabsTrigger>
                    <TabsTrigger value="internal">Financement Interne</TabsTrigger>
                </TabsList>
                <TabsContent value="merchant" className="mt-6">
                    <AdminBnplManagement allUsers={allUsers} />
                </TabsContent>
                <TabsContent value="internal" className="mt-6">
                    <AdminFinancingManagement allUsers={allUsers} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
