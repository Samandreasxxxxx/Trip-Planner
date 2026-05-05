'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { MapRef } from '@/components/Map';
import TripPanel from '@/components/TripPanel';
import SearchBar from '@/components/SearchBar';
import MapToolbar from '@/components/MapToolbar';
import LoginModal from '@/components/LoginModal';
import { LogOut, Moon, Sun } from 'lucide-react';
import styles from './page.module.css';
import { TripStop, TravelMode, Trip } from '@/types';
import { optimizeRoute } from '@/utils/optimization';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const activeTrip = trips.find(t => t.id === activeTripId);

  const [activeTool, setActiveTool] = useState<'select' | 'pin'>('select');
  const [focusLocation, setFocusLocation] = useState<{lng: number, lat: number, id: string} | null>(null);
  const [showTripPanel, setShowTripPanel] = useState(true);
  const [unit, setUnit] = useState<'km' | 'mi'>('km');
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [showTerrain, setShowTerrain] = useState(false);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const [showBudgetDashboard, setShowBudgetDashboard] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  
  const mapRef = useRef<MapRef>(null);

  // Load from local storage or URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTripId = urlParams.get('trip');

    const loadSharedTrip = async (id: string) => {
      const { data, error } = await supabase
        .from('shared_trips')
        .select('*')
        .eq('id', id)
        .single();
      
      if (data && !error) {
        const sharedTrip: Trip = {
          id: data.id,
          name: data.name + ' (Shared)',
          stops: data.stops,
          createdAt: data.created_at
        };
        setStops(data.stops);
        setTrips(prev => [sharedTrip, ...prev]);
        setActiveTripId(data.id);
        
        // Remove query param to avoid re-loading on refresh if they switch trips
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    if (sharedTripId) {
      loadSharedTrip(sharedTripId);
      return;
    }

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

    const savedUser = localStorage.getItem('trip-planner-user');
    if (savedUser) setUser(savedUser);
    setIsLoaded(true);
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
    
    const lastStop = stops[stops.length - 1];
    const dayNumber = lastStop ? lastStop.dayNumber : 1;

    setStops(prev => [...prev, {
      id: newId,
      lng,
      lat,
      title: 'Loading location...',
      description: '',
      dayNumber: dayNumber,
      category: 'other'
    }]);

    // Reverse geocode to get a nice name
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`);
      const data = await res.json();
      
      const placeName = data.features?.[0]?.text || 'New Stop';
      const insights = generateInsights(placeName, 'other');

      
      setStops(prev => prev.map(stop => 
        stop.id === newId ? { ...stop, title: placeName, ...insights } : stop
      ));
    } catch (e) {
      setStops(prev => prev.map(stop => 
        stop.id === newId ? { ...stop, title: 'New Stop' } : stop
      ));
    }
  }, [activeTool, stops]);

  const generateInsights = (name: string, category: string) => {
    // Simulated AI insights based on name/category
    const ratings: {[key: string]: number} = { 'Eiffel': 4.8, 'Louvre': 4.7, 'Disney': 4.6, 'Park': 4.5, 'Museum': 4.4 };
    const bestTimes: {[key: string]: string} = { 'restaurant': 'Evenings (7pm-9pm)', 'hotel': 'Check-in (3pm)', 'sightseeing': 'Early Morning (8am)', 'park': 'Afternoon' };
    const transport: {[key: string]: string} = { 'restaurant': 'Walk or Taxi', 'sightseeing': 'Public Transit', 'park': 'Cycling', 'hotel': 'Airport Shuttle' };
    
    const matchedKey = Object.keys(ratings).find(k => name.includes(k));
    
    return {
      rating: matchedKey ? ratings[matchedKey] : (4.0 + Math.random() * 0.9),
      bestTime: bestTimes[category] || '10:00 AM - 4:00 PM',
      bestTransport: transport[category] || 'Public Transit',
      proTip: `Known for its ${category === 'restaurant' ? 'local flavors' : 'amazing architecture'}. Avoid peak crowds by visiting on weekdays.`,
      imageUrl: `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80` // Mock image
    };
  };

  const handleSearchSelect = (lng: number, lat: number, placeName: string) => {
    // Auto-add from search
    const newId = crypto.randomUUID();
    const insights = generateInsights(placeName, 'other');
    setStops(prev => [...prev, {
      id: newId,
      lng,
      lat,
      title: placeName,
      description: '',
      dayNumber: 1,
      category: 'other',
      ...insights
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

  const handleOptimizeDay = async (dayNum: number) => {
    const dayStops = stops.filter(s => s.dayNumber === dayNum);
    if (dayStops.length < 3) return;

    const optimized = await optimizeRoute(dayStops);
    
    setStops(prev => {
      const newStops = [...prev];
      // Find the first occurrence of a stop from this day to maintain position in the global list
      const startIdx = newStops.findIndex(s => s.dayNumber === dayNum);
      const count = newStops.filter(s => s.dayNumber === dayNum).length;
      newStops.splice(startIdx, count, ...optimized);
      return newStops;
    });
  };

  const handleShareTrip = async () => {
    const activeTrip = trips.find(t => t.id === activeTripId);
    if (!activeTrip) return null;

    try {
      const { data, error } = await supabase
        .from('shared_trips')
        .insert([
          { 
            name: activeTrip.name, 
            stops: stops 
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const url = `${window.location.origin}/?trip=${data.id}`;
        await navigator.clipboard.writeText(url);
        return url;
      }
    } catch (e) {
      console.error('Failed to share trip:', e);
      alert('Failed to share trip. Make sure your Supabase table "shared_trips" exists.');
    }
    return null;
  };

  const handleCycleStyle = () => {
    const styles = [
      'mapbox://styles/mapbox/dark-v11',
      'mapbox://styles/mapbox/light-v11',
      'mapbox://styles/mapbox/satellite-v9',
      'mapbox://styles/mapbox/streets-v11'
    ];
    const currentIndex = styles.indexOf(mapStyle);
    setMapStyle(styles[(currentIndex + 1) % styles.length]);
  };

  const openInGoogleMaps = () => {
    if (stops.length === 0) return;
    const origin = `${stops[0].lat},${stops[0].lng}`;
    const destination = `${stops[stops.length-1].lat},${stops[stops.length-1].lng}`;
    const waypoints = stops.slice(1, -1).map(s => `${s.lat},${s.lng}`).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=${travelMode}`;
    window.open(url, '_blank');
  };

  const handleLogout = () => {
    localStorage.removeItem('trip-planner-user');
    setUser(null);
  };

  const handleLogin = (name: string) => {
    localStorage.setItem('trip-planner-user', name);
    setUser(name);
  };

  if (!isLoaded) return null;

  return (
    <main className={styles.main}>
      {showLoginModal && <LoginModal onLogin={(u) => { handleLogin(u); setShowLoginModal(false); }} />}

      <div className={styles.topRightNav}>
        {user ? (
          <button className={styles.navBtn} onClick={handleLogout} title="Sign Out">
            {user.slice(0, 1).toUpperCase()} <LogOut size={14} style={{marginLeft: '4px'}} />
          </button>
        ) : (
          <button className={styles.navBtn} onClick={() => setShowLoginModal(true)}>
            Sign In
          </button>
        )}
      </div>

      {!showTripPanel && (
        <button 
          className={styles.openPanelBtn}
          onClick={() => setShowTripPanel(true)}
          title="Open Trip Panel"
        >
          <div className={styles.arrowIcon}></div>
        </button>
      )}

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
        onUpdateTrip={(id, updates) => setTrips(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))}
        onOptimizeDay={handleOptimizeDay}
        onShareTrip={handleShareTrip}
        getMapScreenshot={() => mapRef.current ? mapRef.current.getScreenshot() : Promise.resolve('')}
        onOpenInGoogleMaps={openInGoogleMaps}
        onToggleBudgetDashboard={() => setShowBudgetDashboard(!showBudgetDashboard)}
        numPeople={activeTrip?.numPeople || 1}
        onUpdateNumPeople={(num) => {
          setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, numPeople: num } : t));
        }}
        onUpdateParticipants={(participants) => {
          setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, participants } : t));
        }}
        onAddStops={(newStops) => {
          setStops(prev => [...prev, ...newStops]);
        }}
        fixedCosts={activeTrip?.fixedCosts || []}
        onUpdateFixedCosts={(fixedCosts) => {
          setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, fixedCosts } : t));
        }}
      />

      <div className={`${styles.mapArea} ${showTripPanel ? styles.panelOpen : ''}`}>
        <SearchBar onSelect={handleSearchSelect} />
        <MapToolbar 
          activeTool={activeTool} 
          onToolChange={setActiveTool} 
          mapStyle={mapStyle}
          onCycleStyle={handleCycleStyle}
          onFitAll={() => mapRef.current?.fitAll()}
        />
        <Map 
          ref={mapRef}
          stops={stops} 
          focusLocation={focusLocation} 
          onMapClick={handleMapClick} 
          travelMode={travelMode}
          unit={unit}
          mapStyle={mapStyle}
        />
      </div>
    </main>
  );
}
