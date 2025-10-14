
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Map as LeafletMap, LayerGroup, Marker as LeafletMarker } from 'leaflet';
import type { Order, Location, User } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Fix for default icon issue with Leaflet in React
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
} catch (e) {
  // This can fail in SSR, it's fine.
}

const createRoutePointIcon = (number: number, bgColor: string = 'hsl(var(--primary))') => {
    const style = `
      background-color: ${bgColor};
      color: hsl(var(--primary-foreground));
      border-radius: 9999px;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
      border: 2px solid white;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    `;
    return new L.DivIcon({
        html: `<div style="${style}">${number}</div>`,
        className: 'bg-transparent border-none',
        iconSize: [32, 32],
        iconAnchor: [16, 32], 
    });
};

const createPharmacyIcon = () => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="hsl(var(--primary))" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.4));">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 9.8C20 17.5 12 22 12 22Z" />
        <path d="M14 10h-4v4h4v-4Z"/>
        <path d="M10 10V8a2 2 0 1 1 4 0v2"/>
    </svg>
    `;
    return new L.DivIcon({
        html: svg,
        className: 'bg-transparent border-none',
        iconSize: [38, 38],
        iconAnchor: [19, 38],
    });
};


const createPendingIcon = () => {
    const style = `
      background-color: hsl(var(--muted-foreground));
      border-radius: 9999px;
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid white;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    `;
    return new L.DivIcon({
        html: `<div style="${style}"></div>`,
        className: 'bg-transparent border-none',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
    });
};

const createMotorcycleIcon = (color: string, bearing: number = 0) => {
    const svg = `
      <svg width="38" height="38" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${bearing}deg); transition: transform 0.5s ease-out; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.4));">
          <g stroke="${color}" stroke-width="35" stroke-linecap="round" stroke-linejoin="round">
            <path fill="#fff" d="M192 224h128v104a40 40 0 01-40 40h-48a40 40 0 01-40-40.24V224Z"/>
            <path fill="#fff" d="M256 368v48l-48 48h144l-48-48v-48"/>
            <path fill="none" d="M352 224c0-39.76 32.24-72 72-72h0a72 72 0 0172 72h-144Z"/>
            <circle fill="${color}" cx="352" cy="152" r="32"/>
            <path fill="#fff" d="M160 224c0-39.76-32.24-72-72-72h0a72 72 0 00-72 72h144Z"/>
            <circle fill="${color}" cx="160" cy="152" r="32"/>
          </g>
      </svg>
    `;
    return new L.DivIcon({
        html: svg,
        className: 'bg-transparent border-none',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
    });
};

export interface RouteInfo {
    deliveryPerson: User;
    orders: Order[];
    color: string;
    currentLocation?: { lat: number, lng: number };
    bearing?: number;
}

interface MapComponentProps {
    pharmacyLocation: Location & { lat: number; lng: number };
    routes: RouteInfo[];
    pendingOrders: Order[];
    className?: string;
    optimizedPolyline?: string | null;
}

const MapComponent = ({ pharmacyLocation, routes, pendingOrders, className, optimizedPolyline }: MapComponentProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markersRef = useRef<LayerGroup>(new L.LayerGroup());
    const motorcycleMarkersRef = useRef<Record<string, LeafletMarker>>({});
    const polylineRef = useRef<L.Polyline | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current).setView(
                [pharmacyLocation.lat, pharmacyLocation.lng], 13
            );
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            markersRef.current.addTo(map);
            mapRef.current = map;
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // Only runs once on mount

    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;
        markersRef.current.clearLayers();

        const allMarkersBounds: L.LatLng[] = [];

        // Pharmacy Marker
        const pharmacyMarker = L.marker([pharmacyLocation.lat, pharmacyLocation.lng], { icon: createPharmacyIcon(), zIndexOffset: 2000 })
            .bindPopup(`<b>Droguería Avenida (Punto de Partida)</b><br />${pharmacyLocation.address}`);
        markersRef.current.addLayer(pharmacyMarker);
        allMarkersBounds.push(pharmacyMarker.getLatLng());
        
        // Draw pending orders as individual gray markers
        pendingOrders.forEach(order => {
             if (order.deliveryLocation.lat && order.deliveryLocation.lng) {
                const position: L.LatLngExpression = [order.deliveryLocation.lat, order.deliveryLocation.lng];
                allMarkersBounds.push(L.latLng(position as L.LatLngTuple));
                const marker = L.marker(position, { icon: createPendingIcon() })
                    .bindPopup(`<b>Pedido Pendiente</b><br />Cliente: ${order.client.fullName}<br />Dirección: ${order.deliveryLocation.address}`);
                markersRef.current.addLayer(marker);
             }
        });
        
        // --- Manage motorcycle markers for assigned routes ---
        const currentMotorcycleIds = new Set(routes.map(r => r.deliveryPerson.id));

        // Remove markers for routes that are no longer assigned
        Object.keys(motorcycleMarkersRef.current).forEach(personId => {
            if (!currentMotorcycleIds.has(personId)) {
                motorcycleMarkersRef.current[personId].remove();
                delete motorcycleMarkersRef.current[personId];
            }
        });

        routes.forEach(route => {
            // Draw the order markers for the assigned route
            route.orders.forEach((order, index) => {
                if (order.deliveryLocation.lat && order.deliveryLocation.lng) {
                    const position: L.LatLngExpression = [order.deliveryLocation.lat, order.deliveryLocation.lng];
                    allMarkersBounds.push(L.latLng(position as L.LatLngTuple));

                    const marker = L.marker(position, { icon: createRoutePointIcon(index + 1, route.color) })
                        .bindPopup(`<b>Ruta: ${route.deliveryPerson.name}</b><br/>#${index + 1} - Pedido de ${order.client.fullName}<br />${order.deliveryLocation.address}`);
                    markersRef.current.addLayer(marker);
                }
            });
            
            // Draw or update the motorcycle marker
            const personId = route.deliveryPerson.id;
            const hasValidCurrentLocation = route.currentLocation && typeof route.currentLocation.lat === 'number' && typeof route.currentLocation.lng === 'number';
            
            if (hasValidCurrentLocation) {
                const location = route.currentLocation!;
                const icon = createMotorcycleIcon(route.color, route.bearing);

                if (motorcycleMarkersRef.current[personId]) {
                    motorcycleMarkersRef.current[personId].setLatLng([location.lat, location.lng]);
                    motorcycleMarkersRef.current[personId].setIcon(icon);
                } else {
                    const motorcycleMarker = L.marker([location.lat, location.lng], {
                        icon,
                        zIndexOffset: 1000
                    }).bindPopup(`<b>${route.deliveryPerson.name}</b><br/>En ruta...`);
                    motorcycleMarker.addTo(map);
                    motorcycleMarkersRef.current[personId] = motorcycleMarker;
                }
                allMarkersBounds.push(L.latLng(location.lat, location.lng));
            }
        });
        
         if (optimizedPolyline) {
            if (polylineRef.current) {
                polylineRef.current.remove();
            }
            // @ts-ignore
            const decoded = L.Polyline.fromEncoded(optimizedPolyline).getLatLngs();
            polylineRef.current = L.polyline(decoded, { color: 'hsl(var(--accent))', weight: 5, opacity: 0.8 }).addTo(map);
            map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
        } else {
            if (polylineRef.current) {
                polylineRef.current.remove();
                polylineRef.current = null;
            }
            if (allMarkersBounds.length > 1 && map.getBoundsZoom(L.latLngBounds(allMarkersBounds))) {
                map.fitBounds(L.latLngBounds(allMarkersBounds), { padding: [50, 50] });
            } else if (allMarkersBounds.length === 1) {
                 map.setView(allMarkersBounds[0], 15);
            } else {
                 map.setView([pharmacyLocation.lat, pharmacyLocation.lng], 13);
            }
        }

        const allOrdersOnMap = [...routes.flatMap(r => r.orders), ...pendingOrders];
        const ordersWithoutCoords = allOrdersOnMap.filter(order => !order.deliveryLocation.lat || !order.deliveryLocation.lng);
            
        if (ordersWithoutCoords.length > 0) {
            toast({
                variant: 'destructive',
                title: 'Faltan Coordenadas',
                description: `${ordersWithoutCoords.length} pedido(s) no tienen coordenadas y no se mostrarán en el mapa.`,
            });
        }
    }, [routes, pendingOrders, pharmacyLocation, toast, optimizedPolyline]);

    return <div ref={mapContainerRef} className={className || "w-full h-full rounded-lg z-0"} />;
};

export default MapComponent;

    