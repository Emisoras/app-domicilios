
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { RouteInfo } from '@/components/dashboard/map-component';
import type { Order, Location } from '@/types';

// Dynamically import the map component with ssr: false
const MapComponent = dynamic(() => import('@/components/dashboard/map-component'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-lg" />
});

interface DashboardMapProps {
    pharmacyLocation: Location & { lat: number, lng: number };
    routes: RouteInfo[];
    pendingOrders: Order[];
}

export function DashboardMap({ pharmacyLocation, routes, pendingOrders }: DashboardMapProps) {
    return (
        <MapComponent 
            pharmacyLocation={pharmacyLocation} 
            routes={routes} 
            pendingOrders={pendingOrders}
            className="w-full h-[400px] rounded-lg z-0"
        />
    );
}
