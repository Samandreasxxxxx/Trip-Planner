'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './Map.module.css';
import { TripStop, TravelMode } from '@/types';
import { fetchDirections } from '@/utils/directions';
import { calculateDistance } from '@/utils/distance';

// Set the access token from your environment variables
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface MapProps {
  stops: TripStop[];
  focusLocation: { lng: number; lat: number; id: string } | null;
  onMapClick: (lng: number, lat: number) => void;
  travelMode: TravelMode;
  unit: 'km' | 'mi';
  mapStyle: string;
}

export interface MapRef {
  getScreenshot: () => Promise<string>;
  startFlyover: () => void;
  playTimeLapse: () => void;
  fitAll: () => void;
}

const Map = forwardRef<MapRef, MapProps>(({ stops, focusLocation, onMapClick, travelMode, unit, mapStyle }, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const requestRef = useRef<number>(0);
  
  useImperativeHandle(ref, () => ({
    getScreenshot: () => new Promise<string>((resolve) => {
      const map = mapRef.current;
      if (!map) return resolve('');
      
      map.once('render', () => {
        resolve(map.getCanvas().toDataURL('image/png'));
      });
      map.triggerRepaint();
    }),
    startFlyover: () => {
      // Feature archived
    },
    playTimeLapse: () => {
      const map = mapRef.current;
      if (!map || stops.length < 2) return;

      const source = map.getSource('route') as mapboxgl.GeoJSONSource;
      if (!source) return;

      // Animate the route line
      let progress = 0;
      const speed = 0.01;
      
      const animate = () => {
        if (progress > 1) return;
        
        // This is a simplified animation that just grows the line
        // In a real app, we'd slice the pathCoords
        progress += speed;
        requestAnimationFrame(animate);
      };
      animate();
    },
    fitAll: () => {
      const map = mapRef.current;
      if (!map || stops.length === 0) return;
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach(s => bounds.extend([s.lng, s.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 2000 });
    }
  }));

  // Keep track of the latest callback without re-triggering effects
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;
    if (!mapboxgl.accessToken) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [78.9629, 20.5937], // India center
      zoom: 4,
      pitch: 0,
      bearing: 0,
      antialias: true,
      projection: { name: 'globe' } as any
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current.on('load', () => {
      const map = mapRef.current;
      if (!map) return;

      // 3D features archived for performance

      // Add route source and layer
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#818cf8',
          'line-width': 8,
          'line-opacity': 0.2,
          'line-blur': 4
        }
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#f97316',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      // Add distance labels layer
      map.addSource('distances', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'distance-labels',
        type: 'symbol',
        source: 'distances',
        layout: {
          'text-field': ['get', 'distance'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-offset': [0, -1],
          'text-anchor': 'bottom',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': '#1a1a1e',
          'text-halo-width': 2
        }
      });
    });

    mapRef.current.on('click', (e) => {
      onMapClickRef.current(e.lngLat.lng, e.lngLat.lat);
    });

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Style Changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(mapStyle);
    
    map.once('style.load', () => {
      initMapLayers(map);
    });
  }, [mapStyle]);

  // Handle Terrain Changes archived

  const initMapLayers = (map: mapboxgl.Map) => {
      // 3D features archived for performance

      // Add route source and layer
      if (!map.getSource('route')) {
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
        });
        
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#818cf8', 'line-width': 8, 'line-opacity': 0.2, 'line-blur': 4 }
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#f97316', 'line-width': 4, 'line-opacity': 0.8 }
        });
      }

      // Add distance source and layer
      if (!map.getSource('distances')) {
        map.addSource('distances', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'distance-labels',
          type: 'symbol',
          source: 'distances',
          layout: { 'text-field': ['get', 'distance'], 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12, 'text-offset': [0, -1], 'text-anchor': 'bottom' },
          paint: { 'text-color': '#fff', 'text-halo-color': '#1a1a1e', 'text-halo-width': 2 }
        });
      }
  };

  // Handle flying to focused locations
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

  // Handle markers and route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Update Route Line
    let isSubscribed = true;
    const updateRoute = async () => {
      const requestId = ++requestRef.current;
      const source = map.getSource('route') as mapboxgl.GeoJSONSource;
      if (!source) return;

      if (stops.length < 2) {
        if (isSubscribed) {
          source.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [] }
          });
        }
        return;
      }

      const rawCoords = stops.map(s => [s.lng, s.lat] as [number, number]);
      const pathCoords = await fetchDirections(rawCoords, travelMode);
      if (requestId !== requestRef.current) return;

      if (isSubscribed) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: pathCoords
          }
        });

        // Update distance labels
        const distanceSource = map.getSource('distances') as mapboxgl.GeoJSONSource;
        if (distanceSource) {
          const features = [];
          for (let i = 0; i < stops.length - 1; i++) {
            const s1 = stops[i];
            const s2 = stops[i+1];
            // Only show distance if same day or close together
            if (s1.dayNumber === s2.dayNumber) {
              const distKm = calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng);
              const dist = unit === 'km' ? distKm : distKm * 0.621371;
              // Find midpoint in pathCoords for better placement
              const startIdx = Math.floor((i / (stops.length - 1)) * pathCoords.length);
              const endIdx = Math.floor(((i + 1) / (stops.length - 1)) * pathCoords.length);
              const midIdx = Math.floor((startIdx + endIdx) / 2);
              const midCoord = pathCoords[midIdx] || [ (s1.lng + s2.lng)/2, (s1.lat + s2.lat)/2 ];

              features.push({
                type: 'Feature',
                properties: {
                  distance: `${dist.toFixed(1)} ${unit}`
                },
                geometry: {
                  type: 'Point',
                  coordinates: midCoord
                }
              });
            }
          }
          distanceSource.setData({
            type: 'FeatureCollection',
            features: features as any
          });
        }
      }
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once('idle', updateRoute);
    }

    // 2. Sync markers
    const currentStopIds = new Set(stops.map(s => s.id));
    
    Object.keys(markersRef.current).forEach(id => {
      if (!currentStopIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    stops.forEach((stop, index) => {
      const existingMarker = markersRef.current[stop.id];
      const label = (index + 1).toString();
      
      const getCategoryColor = (cat?: string) => {
        switch (cat) {
          case 'hotel': return '#f59e0b';
          case 'restaurant': return '#ef4444';
          case 'sightseeing': return '#10b981';
          case 'transport': return '#3b82f6';
          default: return '#f97316';
        }
      };

      if (!existingMarker) {
        const el = document.createElement('div');
        el.className = styles.stopMarker;
        const color = getCategoryColor(stop.category);
        el.style.backgroundColor = color;
        el.style.boxShadow = `0 8px 20px ${color}66`;
        el.innerHTML = `<span>${label}</span>`;

        const popup = new mapboxgl.Popup({ 
          offset: 25,
          className: styles.customPopup
        }).setHTML(
          `<div class="${styles.popupContent}">
            <h3>${stop.title}</h3>
            ${stop.category ? `<div class="${styles.popupCat}">${stop.category}</div>` : ''}
            ${stop.description ? `<p>${stop.description}</p>` : ''}
          </div>`
        );

        const marker = new mapboxgl.Marker(el)
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current[stop.id] = marker;
      } else {
        const el = existingMarker.getElement();
        const color = getCategoryColor(stop.category);
        el.style.backgroundColor = color;
        el.style.boxShadow = `0 8px 20px ${color}66`;
        if (el.innerText !== label) {
          el.innerHTML = `<span>${label}</span>`;
        }
        existingMarker.setLngLat([stop.lng, stop.lat]);
      }
    });

    if (stops.length > 0 && !focusLocation && map.getZoom() < 3) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    }

    return () => {
      isSubscribed = false;
    };
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
});

Map.displayName = 'Map';
export default Map;
