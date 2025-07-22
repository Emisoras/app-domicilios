'use client';

import { useState, useEffect, useRef } from 'react';
import { getOrdersByDeliveryPerson } from "@/actions/order-actions";
import { updateUserLocation } from '@/actions/user-actions';
import { AssignedRoutesList } from "./components/assigned-routes-list";
import { Card, CardContent } from "@/components/ui/card";
import type { Order, User } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LocateFixed } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Haversine formula to calculate bearing between two points
const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRadians = (deg: number) => deg * Math.PI / 180;
    const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
    const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
              Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
    const brng = Math.atan2(y, x);
    const a = (brng * 180 / Math.PI + 360) % 360; // Normalize to 0-360
    return a;
};


export default function MisRutasPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionUserId, setSessionUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const lastPosition = useRef<{ lat: number, lng: number } | null>(null);

    useEffect(() => {
        const fetchSessionAndOrders = async () => {
            setIsLoading(true);
            try {
                const sessionRes = await fetch('/api/session');
                if (!sessionRes.ok) throw new Error("Inicia sesión para ver tus rutas.");
                const session = await sessionRes.json();
                
                setSessionUserId(session.userId);
                const initialOrders = await getOrdersByDeliveryPerson(session.userId);
                setOrders(initialOrders);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSessionAndOrders();
    }, []);


    useEffect(() => {
        if (!sessionUserId) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                let bearing = 0;
                if (lastPosition.current) {
                    bearing = getBearing(lastPosition.current.lat, lastPosition.current.lng, latitude, longitude);
                }

                updateUserLocation(sessionUserId, { lat: latitude, lng: longitude, bearing });
                
                lastPosition.current = { lat: latitude, lng: longitude };
            },
            (geoError) => {
                console.error("Geolocation error:", geoError);
                setError("No se pudo obtener la ubicación. Por favor, habilita los permisos de geolocalización en tu navegador.");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        // Cleanup the watcher when the component unmounts
        return () => navigator.geolocation.clearWatch(watchId);
    }, [sessionUserId]);


    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        )
    }

    if (error) {
         return (
             <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    <p>{error}</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline">Mis Rutas Asignadas</h1>
                <p className="text-muted-foreground">Aquí puedes ver los detalles de los pedidos que debes entregar hoy.</p>
            </div>
             <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                <LocateFixed className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
                <AlertTitle>Seguimiento GPS Activo</AlertTitle>
                <AlertDescription>
                    Tu ubicación se está compartiendo en tiempo real para optimizar tu ruta y notificar a los clientes.
                </AlertDescription>
            </Alert>
            <AssignedRoutesList initialOrders={orders} />
        </div>
    );
}
