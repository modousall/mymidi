
"use client";

import { useMemo, useState } from 'react';
import { useFeatureFlags, type Feature } from '@/hooks/use-feature-flags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { CreditCard, Users, Clock, PiggyBank, Wallet, Handshake, HandCoins } from 'lucide-react';
import AdminFeatureDetail from './admin-feature-detail';
import AdminProductManagement from './admin-product-management';
import { formatCurrency } from '@/lib/utils';
// Note: useUserManagement is removed. KPIs will be disabled for now.
// A new data source is needed for admin-level user aggregation.

const KPICard = ({ title, value, icon, isEnabled, onToggle, description, featureKey, onClick }: { title: string, value: string, icon: JSX.Element, isEnabled?: boolean, onToggle?: (feature: Feature, value: boolean) => void, description: string, featureKey?: Feature, onClick?: () => void }) => (
    <Card className={`flex flex-col ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`} onClick={onClick}>
        <CardHeader className="flex-row items-center gap-4 space-y-0 pb-2">
            <div className="p-3 bg-primary/10 rounded-full text-primary">{icon}</div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">Total des actifs sur la plateforme</p>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4 border-t pt-4">
             <p className="text-xs text-muted-foreground">{description}</p>
             {isEnabled !== undefined && onToggle && featureKey && (
                <div className="flex items-center space-x-2">
                    <Switch
                        id={featureKey}
                        checked={isEnabled}
                        onCheckedChange={(val) => featureKey && onToggle(featureKey, val)}
                        aria-label={`Activer ou désactiver ${title}`}
                    />
                    <Label htmlFor={featureKey} className="cursor-pointer">{isEnabled ? "Activé" : "Désactivé"}</Label>
                </div>
            )}
        </CardFooter>
    </Card>
);

export default function AdminFeatureManagement() {
  const { flags, setFlag } = useFeatureFlags();
  const [activeView, setActiveView] = useState<'overview' | 'featureDetail' | 'billers'>('overview');
  const [selectedFeature, setSelectedFeature] = useState<'mainBalance' | 'vaults' | 'virtualCards' | 'tontine' | null>(null);

  // KPIs are disabled as they depended on the removed useUserManagement hook.
  const kpis = {
    mainBalance: 0,
    virtualCards: 0,
    vaults: 0,
    tontine: 0,
  }
  
  const allProducts = [
    { featureKey: 'mainBalance', title: "Comptes Principaux", value: formatCurrency(kpis.mainBalance), icon: <Wallet/>, description: "Somme de tous les soldes principaux des utilisateurs.", isToggleable: false },
    { featureKey: 'vaults', title: "Coffres / Tirelires", value: formatCurrency(kpis.vaults), icon: <PiggyBank />, description: "Permettre aux utilisateurs de créer des coffres d'épargne.", isToggleable: true },
    { featureKey: 'virtualCards', title: "Cartes Virtuelles", value: formatCurrency(kpis.virtualCards), icon: <CreditCard/>, description: "Activer la création et l'utilisation de cartes virtuelles.", isToggleable: true },
    { featureKey: 'tontine', title: "Tontines", value: formatCurrency(kpis.tontine), icon: <Users/>, description: "Permettre la création et la participation à des groupes d'épargne.", isToggleable: true },
  ];

  const handleFeatureClick = (feature: 'mainBalance' | 'vaults' | 'virtualCards' | 'tontine') => {
      setSelectedFeature(feature);
      setActiveView('featureDetail');
  }

  const handleBackToOverview = () => {
      setActiveView('overview');
      setSelectedFeature(null);
  }

  if(activeView === 'featureDetail' && selectedFeature) {
      return <AdminFeatureDetail feature={selectedFeature} onBack={handleBackToOverview} />
  }
  
  if (activeView === 'billers') {
      return <AdminProductManagement onBack={handleBackToOverview} />
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Services</CardTitle>
          <CardDescription>
            Activez ou désactivez les fonctionnalités et cliquez sur une carte pour gérer le service correspondant.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allProducts.map(product => {
            const featureKey = product.featureKey as Feature;
            const isClickable = ['mainBalance', 'vaults', 'virtualCards', 'tontine'].includes(product.featureKey);
            return (
                <KPICard 
                    key={product.featureKey}
                    title={product.title}
                    value={product.value}
                    icon={product.icon}
                    description={product.description}
                    isEnabled={product.isToggleable ? flags[featureKey] : undefined}
                    onToggle={product.isToggleable ? setFlag : undefined}
                    featureKey={product.isToggleable ? featureKey : undefined}
                    onClick={isClickable ? () => handleFeatureClick(product.featureKey as any) : undefined}
                />
            )
        })}

        <Card className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('billers')}>
            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-2">
                <div className="p-3 bg-primary/10 rounded-full text-primary"><Handshake /></div>
                <CardTitle className="text-lg font-semibold">Gestion des Facturiers</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-3xl font-bold">&nbsp;</p> {/* Placeholder */}
                 <p className="text-sm text-muted-foreground">Configurez les services externes</p>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 border-t pt-4">
                 <p className="text-xs text-muted-foreground">Gérer les facturiers (Senelec, SDE) et les opérateurs Mobile Money (Wave, OM).</p>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
