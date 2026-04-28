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
  focusLocation: { lng: number; lat: number; id: string } | null;
  onMapClick: (lng: number, lat: number) => void;
}

export default function Map({ stops, focusLocation, onMapClick }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  // Keep track of the latest callback without re-triggering effects
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [78.9629, 20.5937], // India center
      zoom: 4,
      pitch: 0,
      bearing: 0,
      antialias: true, // Improves quality
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current.on('click', (e) => {
      onMapClickRef.current(e.lngLat.lng, e.lngLat.lat);
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
  }, []); // Empty dependency array ensures Map initializes exactly once

  // Handle flying to focused locations (from search or sidebar click)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusLocation) return;

    map.flyTo({
      center: [focusLocation.lng, focusLocation.lat],
      zoom: 12,
      essential: true,
      duration: 1500
    });
  }, [focusLocation]);

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
    if (stops.length > 0 && !focusLocation && map.getZoom() < 3) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    }
  }, [stops, focusLocation]);

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
