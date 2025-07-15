'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

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

interface AddressMapPickerProps {
    center: { lat: number; lng: number };
    onLocationChange: (location: { lat: number; lng: number }) => void;
}

const AddressMapPicker = ({ center, onLocationChange }: AddressMapPickerProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<LeafletMarker | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // This is to prevent leaflet from running on the server
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Initialize map
    useEffect(() => {
        if (!isMounted || !mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapRef.current = map;
        
        // This is a hack to resize the map when the dialog opens, as it might not have dimensions initially
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 400);

    }, [isMounted, center.lat, center.lng]);

    // Update marker and view
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;
        map.setView([center.lat, center.lng], map.getZoom() || 15);

        if (!markerRef.current) {
            const marker = L.marker([center.lat, center.lng], {
                draggable: true,
                icon: L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                    shadowSize: [41, 41]
                })
            }).addTo(map);

            marker.on('dragend', () => {
                const newLatLng = marker.getLatLng();
                onLocationChange({ lat: newLatLng.lat, lng: newLatLng.lng });
            });

            markerRef.current = marker;
        } else {
            markerRef.current.setLatLng([center.lat, center.lng]);
        }
    }, [center, onLocationChange]);

    if (!isMounted) {
        return <div className="h-full w-full bg-muted rounded-lg animate-pulse" />;
    }

    return <div ref={mapContainerRef} className="w-full h-full rounded-lg z-0" />;
};

export default AddressMapPicker;
