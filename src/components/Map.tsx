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

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-0.1276, 51.5072],
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
      antialias: true, // Improves quality
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current.on('click', (e) => {
      onMapClick(e.lngLat.lng, e.lngLat.lat);
    });

    // Handle initial sizing and container changes to fix "black area" glitch
    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  // Handle selected location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedLocation) {
      if (!selectedMarkerRef.current) {
        const el = document.createElement('div');
        el.className = styles.selectedMarker;
        selectedMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([selectedLocation.lng, selectedLocation.lat])
          .addTo(map);
      } else {
        selectedMarkerRef.current.setLngLat([selectedLocation.lng, selectedLocation.lat]);
      }
      
      map.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: 14,
        essential: true,
        duration: 1500 // Smooth pan
      });
    } else if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  }, [selectedLocation]);

  // Handle saved stops markers with better performance
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Sync markers
    const currentStopIds = new Set(stops.map(s => s.id));
    
    // Remove markers that are no longer present
    Object.keys(markersRef.current).forEach(id => {
      if (!currentStopIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    stops.forEach((stop, index) => {
      const existingMarker = markersRef.current[stop.id];
      const label = (index + 1).toString();

      if (!existingMarker) {
        const el = document.createElement('div');
        el.className = styles.stopMarker;
        el.innerHTML = `<span>${label}</span>`;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<h3>${stop.title}</h3>${stop.description ? `<p>${stop.description}</p>` : ''}`
        );

        const marker = new mapboxgl.Marker(el)
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current[stop.id] = marker;
      } else {
        const el = existingMarker.getElement();
        if (el.innerText !== label) {
          el.innerHTML = `<span>${label}</span>`;
        }
      }
    });

    // Only fit bounds if no active selection and it's not the initial mount
    if (stops.length > 0 && !selectedLocation && map.getZoom() < 3) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
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
