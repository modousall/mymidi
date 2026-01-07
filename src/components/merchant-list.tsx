
"use client";

import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { ArrowLeft, Search, MapPin, Utensils, ShoppingBasket, Truck, Store } from 'lucide-react';
import { Badge } from './ui/badge';
import { useUserManagement } from '@/hooks/use-user-management';

type Merchant = {
    id: string;
    name: string;
    address: string;
    distance: string;
    category: 'Alimentation' | 'Shopping' | 'Services' | 'Autre';
};

const categoryConfig = {
    Alimentation: { icon: <Utensils className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
    Shopping: { icon: <ShoppingBasket className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
    Services: { icon: <Truck className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
    Autre: { icon: <Store className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
}

type MerchantListProps = {
    onBack: () => void;
}

export default function MerchantList({ onBack }: MerchantListProps) {
    const { users } = useUserManagement();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'all' | Merchant['category']>('all');

    const merchants: Merchant[] = useMemo(() => {
        return users
            .filter(user => user.role === 'merchant')
            .map((user, index) => ({
                id: user.alias,
                name: user.name,
                address: `Adresse ${index + 1}`, // Placeholder address
                distance: `${Math.floor(Math.random() * 20) * 50 + 50}m`, // Placeholder distance
                category: 'Autre', // Placeholder category
            }));
    }, [users]);

    const filteredMerchants = useMemo(() => {
        return merchants.filter(merchant => {
            const searchMatch = merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                merchant.address.toLowerCase().includes(searchTerm.toLowerCase());
            const categoryMatch = selectedCategory === 'all' || merchant.category === selectedCategory;
            return searchMatch && categoryMatch;
        });
    }, [merchants, searchTerm, selectedCategory]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="ghost" size="icon">
                    <ArrowLeft />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-primary">Marchands à proximité</h2>
                    <p className="text-muted-foreground">Trouvez des points de service Midi près de vous.</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Rechercher par nom ou adresse..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} onClick={() => setSelectedCategory('all')}>Tous</Button>
                    <Button variant={selectedCategory === 'Alimentation' ? 'default' : 'outline'} onClick={() => setSelectedCategory('Alimentation')}>Alimentation</Button>
                    <Button variant={selectedCategory === 'Shopping' ? 'default' : 'outline'} onClick={() => setSelectedCategory('Shopping')}>Shopping</Button>
                    <Button variant={selectedCategory === 'Services' ? 'default' : 'outline'} onClick={() => setSelectedCategory('Services')}>Services</Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMerchants.map(merchant => (
                    <Card key={merchant.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg">{merchant.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> {merchant.address}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-between items-center">
                            <Badge className={categoryConfig[merchant.category].color}>
                                {categoryConfig[merchant.category].icon} {merchant.category}
                            </Badge>
                            <span className="font-semibold text-primary">{merchant.distance}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredMerchants.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">Aucun marchand trouvé pour votre recherche.</p>
                </div>
            )}
        </div>
    )
}
