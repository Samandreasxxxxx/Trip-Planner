import { MapPin, MousePointer2, Plane, Car, Footprints, Bike, Train, Globe, Play, Layers } from 'lucide-react';
import { TravelMode } from '@/types';
import styles from './MapToolbar.module.css';

interface MapToolbarProps {
  activeTool: 'select' | 'pin';
  onToolChange: (tool: 'select' | 'pin') => void;
  onFly: () => void;
  hasStops: boolean;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  showTerrain: boolean;
  onToggleTerrain: () => void;
  mapStyle: string;
  onCycleStyle: () => void;
  onPlayTimelapse: () => void;
}

export default function MapToolbar({ 
  activeTool, 
  onToolChange, 
  onFly, 
  hasStops,
  travelMode,
  onTravelModeChange,
  showTerrain,
  onToggleTerrain,
  mapStyle,
  onCycleStyle,
  onPlayTimelapse
}: MapToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button 
        className={`${styles.toolButton} ${activeTool === 'select' ? styles.active : ''}`}
        onClick={() => onToolChange('select')}
        title="Selection Tool (Alt+H)"
      >
        <MousePointer2 size={22} />
      </button>
      
      <button 
        className={`${styles.toolButton} ${activeTool === 'pin' ? styles.activePin : ''}`}
        onClick={() => onToolChange('pin')}
        title="Drop Pin tool (Alt+A)"
      >
        <MapPin size={22} />
        <span className={styles.toolLabel}>Pin</span>
      </button>

      <div className={styles.divider}></div>

      <button 
        className={`${styles.toolButton} ${showTerrain ? styles.active : ''}`}
        onClick={onToggleTerrain}
        title="Toggle 3D Terrain"
      >
        <div className={styles.terrainIcon}>3D</div>
      </button>

      <button 
        className={styles.toolButton}
        onClick={onCycleStyle}
        title="Cycle Map Style"
      >
        <Globe size={22} />
      </button>

      <button 
        className={styles.toolButton}
        onClick={onPlayTimelapse}
        title="Play Journey Timelapse"
      >
        <Play size={20} />
      </button>

      <div className={styles.divider}></div>

      <button 
        className={styles.toolButton}
        onClick={onFly}
        disabled={!hasStops}
        title="3D Flyover Preview"
      >
        <Plane size={22} />
      </button>

      <div className={styles.divider}></div>

      <button 
        className={`${styles.toolButton} ${travelMode === 'driving' ? styles.active : ''}`}
        onClick={() => onTravelModeChange('driving')}
        title="Driving Mode"
      >
        <Car size={20} />
      </button>

      <button 
        className={`${styles.toolButton} ${travelMode === 'walking' ? styles.active : ''}`}
        onClick={() => onTravelModeChange('walking')}
        title="Walking Mode"
      >
        <Footprints size={20} />
      </button>

      <button 
        className={`${styles.toolButton} ${travelMode === 'cycling' ? styles.active : ''}`}
        onClick={() => onTravelModeChange('cycling')}
        title="Cycling Mode"
      >
        <Bike size={20} />
      </button>

      <button 
        className={`${styles.toolButton} ${travelMode === 'transit' ? styles.active : ''}`}
        onClick={() => onTravelModeChange('transit')}
        title="Public Transit"
      >
        <Train size={20} />
      </button>
    </div>
  );
}
