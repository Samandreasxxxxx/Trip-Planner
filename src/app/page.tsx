'use client';

import { useState, useEffect, useCallback } from 'react';
import Map from '@/components/Map';
import Sidebar from '@/components/Sidebar';
import TripPanel from '@/components/TripPanel';
import SearchBar from '@/components/SearchBar';
import MapToolbar from '@/components/MapToolbar';
import styles from './page.module.css';
import { TripStop } from '@/types';

export default function Home() {
  const [stops, setStops] = useState<TripStop[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lng: number, lat: number} | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'pin'>('pin');

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

  const handleMapClick = useCallback((lng: number, lat: number) => {
    // We'll allow clicking anytime for now, but having the tool active is a good visual indicator
    setSelectedLocation({ lng, lat });
  }, []);

  const handleSearchSelect = (lng: number, lat: number) => {
    setSelectedLocation({ lng, lat });
    setActiveTool('pin');
  };

  const addStop = (title: string, description: string) => {
    if (!selectedLocation) return;
    
    const newStop: TripStop = {
      id: crypto.randomUUID(),
      lng: selectedLocation.lng,
      lat: selectedLocation.lat,
      title,
      description
    };
    
    setStops(prev => [...prev, newStop]);
    setSelectedLocation(null);
  };

  const removeStop = (id: string) => {
    setStops(prev => prev.filter(stop => stop.id !== id));
  };

  return (
    <main className={styles.main}>
      <Sidebar />
      <div className={styles.mapArea}>
        <SearchBar onSelect={handleSearchSelect} />
        <MapToolbar activeTool={activeTool} onToolChange={setActiveTool} />
        <Map 
          stops={stops} 
          selectedLocation={selectedLocation} 
          onMapClick={handleMapClick} 
        />
      </div>
      <TripPanel 
        stops={stops} 
        selectedLocation={selectedLocation}
        onAddStop={addStop}
        onRemoveStop={removeStop}
        onCancelSelection={() => setSelectedLocation(null)}
      />
    </main>
  );
}
