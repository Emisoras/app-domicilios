
'use client';

import { useState, useEffect, useRef } from 'react';
import { updateUserLocation } from '@/actions/user-actions';
import { AssignedRoutesList } from "./assigned-routes-list";
import { Card, CardContent } from "@/components/ui/card";
import type { Order, Location } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LocateFixed, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppNotification } from '@/lib/whatsapp';


// Haversine formula to calculate distance between two points on Earth
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRadians = (deg: number) => deg * Math.PI / 180;
    const R = 6371e3; // metres
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};


// Haversine formula to calculate bearing between two points
const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRadians = (deg: number) => deg * Math.PI / 180;
    const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
    const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
              Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
    const brng = Math.atan2(y, x);
    const a = (brng * 180 / NEARBY_DISTANCE_METERS + 360) % 360; // Normalize to 0-360
    return a;
};

const NEARBY_DISTANCE_METERS = 300;

interface DeliveryRouteViewProps {
    initialOrders: Order[];
    pharmacyLocation: Location & { lat: number; lng: number };
    sessionUserId: string;
}

export function DeliveryRouteView({ initialOrders, pharmacyLocation, sessionUserId }: DeliveryRouteViewProps) {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [notifiedOrderIds, setNotifiedOrderIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const lastPosition = useRef<{ lat: number, lng: number } | null>(null);

     // Effect to keep the client-side state in sync if server data changes (e.g., via revalidation)
    useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);

    useEffect(() => {
        if (!sessionUserId || orders.length === 0) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                let bearing = 0;
                if (lastPosition.current) {
                    bearing = getBearing(lastPosition.current.lat, lastPosition.current.lng, latitude, longitude);
                }

                updateUserLocation(sessionUserId, { lat: latitude, lng: longitude, bearing });
                
                lastPosition.current = { lat: latitude, lng: longitude };

                // --- Automatic Nearby Notification Logic ---
                orders.forEach(order => {
                    if (order.deliveryLocation.lat && order.deliveryLocation.lng && !notifiedOrderIds.has(order.id)) {
                        const distance = getDistance(latitude, longitude, order.deliveryLocation.lat, order.deliveryLocation.lng);
                        
                        if (distance <= NEARBY_DISTANCE_METERS) {
                            sendWhatsAppNotification(order.client.phone, 'nearby', order);
                            setNotifiedOrderIds(prev => new Set(prev).add(order.id));
                            toast({
                                title: 'Cliente Notificado',
                                description: `Se ha enviado una notificación de cercanía a ${order.client.fullName}.`,
                            });
                        }
                    }
                });
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
    }, [sessionUserId, orders, toast, notifiedOrderIds]);

    const handleOpenGoogleMaps = () => {
        // pharmacyLocation is guaranteed to be present here because of the server-side check
        if (!pharmacyLocation?.lat || !pharmacyLocation?.lng) {
            toast({ variant: "destructive", title: "Error", description: "No se ha configurado la ubicación de la farmacia." });
            return;
        }

        const origin = `${pharmacyLocation.lat},${pharmacyLocation.lng}`;
        const validOrders = orders.filter(order => order.deliveryLocation.lat && order.deliveryLocation.lng);
        
        if (validOrders.length === 0) {
            toast({ variant: "destructive", title: "Sin Pedidos", description: "No hay pedidos con coordenadas para generar la ruta." });
            return;
        }
        
        const destination = `${validOrders[validOrders.length - 1].deliveryLocation.lat},${validOrders[validOrders.length - 1].deliveryLocation.lng}`;
        const waypoints = validOrders.slice(0, -1).map(order => 
            `${order.deliveryLocation.lat},${order.deliveryLocation.lng}`
        ).join('|');

        let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
        if (waypoints) {
            googleMapsUrl += `&waypoints=${waypoints}`;
        }
        
        window.open(googleMapsUrl, '_blank');
    };

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
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Mis Rutas Asignadas</h1>
                    <p className="text-muted-foreground">Aquí puedes ver los detalles de los pedidos que debes entregar hoy.</p>
                </div>
                {orders.length > 0 && (
                    <Button onClick={handleOpenGoogleMaps} size="lg">
                        <MapIcon className="mr-2" />
                        Iniciar Ruta en Google Maps
                    </Button>
                )}
            </div>
             <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                <LocateFixed className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
                <AlertTitle>Seguimiento GPS Activo</AlertTitle>
                <AlertDescription>
                    Tu ubicación se está compartiendo en tiempo real para optimizar tu ruta y notificar a los clientes automáticamente cuando estés cerca.
                </AlertDescription>
            </Alert>
            <AssignedRoutesList initialOrders={orders} />
        </div>
    );
}

    
