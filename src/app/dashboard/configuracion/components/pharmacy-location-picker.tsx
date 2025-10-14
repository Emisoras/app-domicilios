'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { reverseGeocode } from '@/ai/flows/reverse-geocode-flow';
import { Loader2 } from 'lucide-react';

// Fix for default icon issue
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
} catch (e) {
  // Fails in SSR, fine.
}

interface PharmacyLocationPickerProps {
    initialLocation: { lat: number; lng: number };
    onLocationChange: (location: { lat: number; lng: number; address: string }) => void;
}

const PharmacyLocationPicker = ({ initialLocation, onLocationChange }: PharmacyLocationPickerProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<LeafletMarker | null>(null);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const { toast } = useToast();

    // Consolidated effect for map and marker management
    useEffect(() => {
        // Initialize map
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current).setView([initialLocation.lat, initialLocation.lng], 16);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            mapRef.current = map;

            // Invalidate size after a short delay to ensure the container is visible
            setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 400);
        }

        const map = mapRef.current;
        if (!map) return;
        
        map.setView([initialLocation.lat, initialLocation.lng], map.getZoom() || 16);

        const handleDragEnd = async () => {
            if (!markerRef.current) return;
            const newLatLng = markerRef.current.getLatLng();
            setIsReverseGeocoding(true);
            try {
                const { address } = await reverseGeocode({ lat: newLatLng.lat, lng: newLatLng.lng });
                onLocationChange({ lat: newLatLng.lat, lng: newLatLng.lng, address });
                 toast({ title: "Ubicación Actualizada", description: `Nueva dirección: ${address}` });
            } catch (error: any) {
                console.error("Reverse geocoding failed:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error de Dirección',
                    description: `No se pudo obtener la dirección para la nueva ubicación. ${error.message}`,
                });
                onLocationChange({ lat: newLatLng.lat, lng: newLatLng.lng, address: '' });
            } finally {
                setIsReverseGeocoding(false);
            }
        };
        
        // Manage marker
        if (markerRef.current) {
            markerRef.current.setLatLng([initialLocation.lat, initialLocation.lng]);
        } else {
            const newMarker = L.marker([initialLocation.lat, initialLocation.lng], {
                draggable: true,
                icon: new L.Icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);

            newMarker.on('dragend', handleDragEnd);
            markerRef.current = newMarker;
        }

    }, [initialLocation, onLocationChange, toast]);


    return (
        <div className="relative w-full h-full rounded-lg z-0">
            {isReverseGeocoding && (
                 <div className="absolute inset-0 z-10 h-full w-full flex items-center justify-center bg-background/80 rounded-lg">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
                        <p className="text-muted-foreground mt-2">Obteniendo dirección...</p>
                    </div>
                </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
        </div>
    );
};

export default PharmacyLocationPicker;
