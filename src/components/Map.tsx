'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './Map.module.css';
import { TripStop } from '@/types';

// Set the access token from your environment variables
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface MapProps {
  stops: TripStop[];
  selectedLocation: { lng: number; lat: number } | null;
  onMapClick: (lng: number, lat: number) => void;
}

export default function Map({ stops, selectedLocation, onMapClick }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // initialize map only once

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Premium Dark mode map style
      center: [-0.1276, 51.5072], // Default center (London)
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      onMapClick(lng, lat);
    });

    // Clean up on unmount
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  // Handle selected location marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedLocation) {
      if (!selectedMarkerRef.current) {
        // Create a pulsating marker element for the selected point
        const el = document.createElement('div');
        el.className = styles.selectedMarker;

        selectedMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([selectedLocation.lng, selectedLocation.lat])
          .addTo(mapRef.current);
      } else {
        selectedMarkerRef.current.setLngLat([selectedLocation.lng, selectedLocation.lat]);
      }
      
      // Pan to selected location
      mapRef.current.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: 14,
        essential: true
      });
    } else {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
    }
  }, [selectedLocation]);

  // Handle saved stops markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers that are no longer in the stops list
    const currentStopIds = stops.map(s => s.id);
    Object.keys(markersRef.current).forEach(id => {
      if (!currentStopIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add new markers
    stops.forEach((stop, index) => {
      if (!markersRef.current[stop.id]) {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = styles.stopMarker;
        el.innerHTML = `<span>${index + 1}</span>`;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<h3>${stop.title}</h3>${stop.description ? `<p>${stop.description}</p>` : ''}`
        );

        const marker = new mapboxgl.Marker(el)
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current[stop.id] = marker;
      } else {
        // Update number if order changed
        const el = markersRef.current[stop.id].getElement();
        el.innerHTML = `<span>${index + 1}</span>`;
      }
    });

    // Fit map to markers if there are stops and no selection is active
    if (stops.length > 0 && !selectedLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    }
  }, [stops, selectedLocation]);

  return (
    <div className={styles.mapWrapper}>
      {!mapboxgl.accessToken && (
        <div className={styles.tokenWarning}>
          <p>Please add your Mapbox Access Token to .env.local to view the map.</p>
        </div>
      )}
      <div ref={mapContainerRef} className={styles.mapContainer} />
    </div>
  );
}
