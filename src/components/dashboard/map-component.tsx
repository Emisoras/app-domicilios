'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
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

const createMotorcycleIcon = (color: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32px" height="32px" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  `;
  return new L.DivIcon({
      html: svg,
      className: 'bg-transparent border-none',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
  });
};


export interface RouteInfo {
    deliveryPerson: User;
    orders: Order[];
    color: string;
    currentLocation?: Location & { lat: number, lng: number };
    optimizedPolyline?: string | null;
}

interface MapComponentProps {
    pharmacyLocation: Location & { lat: number; lng: number };
    routes: RouteInfo[];
    pendingOrders: Order[];
    className?: string;
    optimizedPolyline?: string | null; // For pending orders optimization
}

// Decode polyline utility
const decodePolyline = (encoded: string): L.LatLngExpression[] => {
    let points: L.LatLngExpression[] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
};


const MapComponent = ({ pharmacyLocation, routes, pendingOrders, className, optimizedPolyline }: MapComponentProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markersRef = useRef<LayerGroup>(new L.LayerGroup());
    const polylinesRef = useRef<LayerGroup>(new L.LayerGroup());
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
            polylinesRef.current.addTo(map);
            mapRef.current = map;
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [pharmacyLocation]);

    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;
        markersRef.current.clearLayers();
        polylinesRef.current.clearLayers();

        const allMarkersBounds: L.LatLng[] = [];

        // Pharmacy Marker (using default Leaflet icon)
        const pharmacyMarker = L.marker([pharmacyLocation.lat, pharmacyLocation.lng])
            .bindPopup(`<b>Droguería Avenida (Punto de Partida)</b><br />${pharmacyLocation.address}`);
        markersRef.current.addLayer(pharmacyMarker);
        allMarkersBounds.push(pharmacyMarker.getLatLng());
        
        // Draw the optimized route for PENDING orders if a polyline is provided
        if (optimizedPolyline) {
            const decodedPath = decodePolyline(optimizedPolyline);
            const polyline = L.polyline(decodedPath, { color: 'hsl(var(--primary))', weight: 5, opacity: 0.7 });
            polylinesRef.current.addLayer(polyline);

            pendingOrders.forEach((order, index) => {
                 if (order.deliveryLocation.lat && order.deliveryLocation.lng) {
                    const position: L.LatLngExpression = [order.deliveryLocation.lat, order.deliveryLocation.lng];
                    allMarkersBounds.push(L.latLng(position as L.LatLngTuple));
                    const marker = L.marker(position, { icon: createRoutePointIcon(index + 1, 'hsl(var(--primary))') })
                        .bindPopup(`<b>Ruta Optimizada</b><br/>#${index + 1} - Pedido de ${order.client.fullName}<br />${order.deliveryLocation.address}`);
                    markersRef.current.addLayer(marker);
                 }
            });

        } else {
             // Draw pending orders (not optimized) as individual gray markers
            pendingOrders.forEach(order => {
                 if (order.deliveryLocation.lat && order.deliveryLocation.lng) {
                    const position: L.LatLngExpression = [order.deliveryLocation.lat, order.deliveryLocation.lng];
                    allMarkersBounds.push(L.latLng(position as L.LatLngTuple));
                    const marker = L.marker(position, { icon: createPendingIcon() })
                        .bindPopup(`<b>Pedido Pendiente</b><br />Cliente: ${order.client.fullName}<br />Dirección: ${order.deliveryLocation.address}`);
                    markersRef.current.addLayer(marker);
                 }
            });
        }
        
        // Draw ASSIGNED routes
        routes.forEach(route => {
            // Draw the optimized polyline for this assigned route if it exists
            if(route.optimizedPolyline) {
                const decodedPath = decodePolyline(route.optimizedPolyline);
                const polyline = L.polyline(decodedPath, { color: route.color, weight: 5, opacity: 0.7 });
                polylinesRef.current.addLayer(polyline);
            }

            // Draw motorcycle icon at the pharmacy location for now
            if (route.currentLocation?.lat && route.currentLocation?.lng) {
                const motorcycleMarker = L.marker([route.currentLocation.lat, route.currentLocation.lng], {
                    icon: createMotorcycleIcon(route.color),
                    zIndexOffset: 1000
                }).bindPopup(`<b>${route.deliveryPerson.name}</b><br/>En ruta desde la farmacia`);
                markersRef.current.addLayer(motorcycleMarker);
            }
            
            // Draw markers for each stop in the route
            route.orders.forEach((order, index) => {
                if (order.deliveryLocation.lat && order.deliveryLocation.lng) {
                    const position: L.LatLngExpression = [order.deliveryLocation.lat, order.deliveryLocation.lng];
                    allMarkersBounds.push(L.latLng(position as L.LatLngTuple));

                    const marker = L.marker(position, { icon: createRoutePointIcon(index + 1, route.color) })
                        .bindPopup(`<b>Ruta: ${route.deliveryPerson.name}</b><br/>#${index + 1} - Pedido de ${order.client.fullName}<br />${order.deliveryLocation.address}`);
                    markersRef.current.addLayer(marker);
                }
            });
        });
        
        // Adjust map view to fit all markers
        if (allMarkersBounds.length > 1) {
            map.fitBounds(L.latLngBounds(allMarkersBounds), { padding: [50, 50] });
        } else if (allMarkersBounds.length === 1) {
             map.setView(allMarkersBounds[0], 15);
        } else {
             map.setView([pharmacyLocation.lat, pharmacyLocation.lng], 13);
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
