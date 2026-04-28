'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './Map.module.css';

// Set the access token from your environment variables
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Mapbox map here
    // Drop your Mapbox logic, markers, and interactions here
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark mode map style
      center: [2.3522, 48.8566], // Default center (Paris)
      zoom: 12,
    });

    // Add navigation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      mapRef.current?.remove();
    };
  }, []);

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
