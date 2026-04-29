'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { MapRef } from '@/components/Map';
import Sidebar from '@/components/Sidebar';
import TripPanel from '@/components/TripPanel';
import SearchBar from '@/components/SearchBar';
import MapToolbar from '@/components/MapToolbar';
import styles from './page.module.css';
import { TripStop, TravelMode, Trip } from '@/types';

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'pin'>('select');
  const [focusLocation, setFocusLocation] = useState<{lng: number, lat: number, id: string} | null>(null);
  const [showTripPanel, setShowTripPanel] = useState(true);
  const [unit, setUnit] = useState<'km' | 'mi'>('km');
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  
  const mapRef = useRef<MapRef>(null);

  // Load from local storage
  useEffect(() => {
    const savedTrips = localStorage.getItem('trip-planner-trips');
    if (savedTrips) {
      try {
        const parsed = JSON.parse(savedTrips);
        setTrips(parsed);
        if (parsed.length > 0) {
          setActiveTripId(parsed[0].id);
          setStops(parsed[0].stops);
        } else {
          // Create initial trip if none exist
          const initialTrip: Trip = {
            id: crypto.randomUUID(),
            name: 'My First Trip',
            stops: [],
            createdAt: Date.now()
          };
          setTrips([initialTrip]);
          setActiveTripId(initialTrip.id);
        }
      } catch (e) {
        console.error('Failed to parse trips');
      }
    } else {
      // Initialize if empty
      const initialTrip: Trip = {
        id: crypto.randomUUID(),
        name: 'My First Trip',
        stops: [],
        createdAt: Date.now()
      };
      setTrips([initialTrip]);
      setActiveTripId(initialTrip.id);
    }
  }, []);

  // Save active stops to the trips array
  useEffect(() => {
    if (activeTripId) {
      setTrips(prev => prev.map(t => 
        t.id === activeTripId ? { ...t, stops } : t
      ));
    }
  }, [stops, activeTripId]);

  // Save all trips to local storage
  useEffect(() => {
    if (trips.length > 0) {
      localStorage.setItem('trip-planner-trips', JSON.stringify(trips));
    }
  }, [trips]);

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

  const handleSelectTrip = (id: string) => {
    const trip = trips.find(t => t.id === id);
    if (trip) {
      setActiveTripId(id);
      setStops(trip.stops);
    }
  };

  const handleCreateTrip = () => {
    const name = prompt('Enter trip name:');
    if (name) {
      const newTrip: Trip = {
        id: crypto.randomUUID(),
        name,
        stops: [],
        createdAt: Date.now()
      };
      setTrips(prev => [...prev, newTrip]);
      setActiveTripId(newTrip.id);
      setStops([]);
    }
  };

  const handleDeleteTrip = (id: string) => {
    if (trips.length <= 1) {
      alert('You must have at least one trip.');
      return;
    }
    if (confirm('Are you sure you want to delete this trip?')) {
      const newTrips = trips.filter(t => t.id !== id);
      setTrips(newTrips);
      if (activeTripId === id) {
        setActiveTripId(newTrips[0].id);
        setStops(newTrips[0].stops);
      }
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
        unit={unit}
        onUnitToggle={() => setUnit(prev => prev === 'km' ? 'mi' : 'km')}
        trips={trips}
        activeTripId={activeTripId || ''}
        onSelectTrip={handleSelectTrip}
        onCreateTrip={handleCreateTrip}
        onDeleteTrip={handleDeleteTrip}
        onRenameTrip={(id, name) => setTrips(prev => prev.map(t => t.id === id ? { ...t, name } : t))}
        getMapScreenshot={() => mapRef.current ? mapRef.current.getScreenshot() : Promise.resolve('')}
      />
      <div className={`${styles.mapArea} ${showTripPanel ? styles.panelOpen : ''}`}>
        <SearchBar onSelect={handleSearchSelect} />
        <MapToolbar 
          activeTool={activeTool} 
          onToolChange={setActiveTool} 
          onFly={() => mapRef.current?.startFlyover()}
          hasStops={stops.length > 0}
          travelMode={travelMode}
          onTravelModeChange={setTravelMode}
        />
        <Map 
          ref={mapRef}
          stops={stops} 
          focusLocation={focusLocation} 
          onMapClick={handleMapClick} 
          travelMode={travelMode}
        />
      </div>
    </main>
  );
}
