'use client';

import { useState, useEffect } from 'react';
import Map from '@/components/Map';
import Sidebar from '@/components/Sidebar';
import TripPanel from '@/components/TripPanel';
import styles from './page.module.css';
import { TripStop } from '@/types';

export default function Home() {
  const [stops, setStops] = useState<TripStop[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lng: number, lat: number} | null>(null);

  // Load from local storage on mount so it works immediately without DB
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

  // Save to local storage whenever stops change
  useEffect(() => {
    localStorage.setItem('trip-stops', JSON.stringify(stops));
  }, [stops]);

  const handleMapClick = (lng: number, lat: number) => {
    setSelectedLocation({ lng, lat });
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
