'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { MapRef } from '@/components/Map';
import Sidebar from '@/components/Sidebar';
import TripPanel from '@/components/TripPanel';
import SearchBar from '@/components/SearchBar';
import MapToolbar from '@/components/MapToolbar';
import styles from './page.module.css';
import { TripStop } from '@/types';

export default function Home() {
  const [stops, setStops] = useState<TripStop[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'pin'>('select');
  const [focusLocation, setFocusLocation] = useState<{lng: number, lat: number, id: string} | null>(null);
  const [showTripPanel, setShowTripPanel] = useState(true);
  
  const mapRef = useRef<MapRef>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('trip-stops');
    if (saved) {
      try {
        setStops(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse stops from local storage');
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('trip-stops', JSON.stringify(stops));
  }, [stops]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveTool('select');
      } else if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setActiveTool('pin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    if (activeTool === 'select') return;

    // Auto-add stop
    const newId = crypto.randomUUID();
    
    // Optimistic add with placeholder
    setStops(prev => [...prev, {
      id: newId,
      lng,
      lat,
      title: 'Loading location...',
      description: '',
      dayNumber: 1,
      category: 'other'
    }]);

    // Reverse geocode to get a nice name
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`);
      const data = await res.json();
      
      const placeName = data.features?.[0]?.text || 'New Stop';
      
      setStops(prev => prev.map(stop => 
        stop.id === newId ? { ...stop, title: placeName } : stop
      ));
    } catch (e) {
      setStops(prev => prev.map(stop => 
        stop.id === newId ? { ...stop, title: 'New Stop' } : stop
      ));
    }
  }, [activeTool]);

  const handleSearchSelect = (lng: number, lat: number, placeName: string) => {
    // Auto-add from search
    const newId = crypto.randomUUID();
    setStops(prev => [...prev, {
      id: newId,
      lng,
      lat,
      title: placeName,
      description: '',
      dayNumber: 1,
      category: 'other'
    }]);
    setFocusLocation({ lng, lat, id: newId });
  };

  const removeStop = (id: string) => {
    setStops(prev => prev.filter(stop => stop.id !== id));
  };

  const updateStop = (id: string, updates: Partial<TripStop>) => {
    setStops(prev => prev.map(stop => 
      stop.id === id ? { ...stop, ...updates } : stop
    ));
  };

  const handleStopClick = (lng: number, lat: number, id: string) => {
    setFocusLocation({ lng, lat, id });
  };

  const clearAllStops = () => {
    if (confirm('Are you sure you want to clear your entire itinerary?')) {
      setStops([]);
    }
  };

  return (
    <main className={styles.main}>
      <Sidebar onToggleTripPanel={() => setShowTripPanel(!showTripPanel)} isPanelOpen={showTripPanel} />
      <TripPanel 
        isOpen={showTripPanel}
        onClose={() => setShowTripPanel(false)}
        stops={stops} 
        onRemoveStop={removeStop}
        onUpdateStop={updateStop}
        onStopClick={handleStopClick}
        onReorderStops={setStops}
        onClearAll={clearAllStops}
        getMapScreenshot={() => mapRef.current ? mapRef.current.getScreenshot() : Promise.resolve('')}
      />
      <div className={`${styles.mapArea} ${showTripPanel ? styles.panelOpen : ''}`}>
        <SearchBar onSelect={handleSearchSelect} />
        <MapToolbar activeTool={activeTool} onToolChange={setActiveTool} />
        <Map 
          ref={mapRef}
          stops={stops} 
          focusLocation={focusLocation} 
          onMapClick={handleMapClick} 
        />
      </div>
    </main>
  );
}
