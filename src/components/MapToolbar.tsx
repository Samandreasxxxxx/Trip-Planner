import { MapPin, MousePointer2, Globe, GripHorizontal } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import styles from './MapToolbar.module.css';

interface MapToolbarProps {
  activeTool: 'select' | 'pin';
  onToolChange: (tool: 'select' | 'pin') => void;
  showTerrain: boolean;
  onToggleTerrain: () => void;
  mapStyle: string;
  onCycleStyle: () => void;
}

export default function MapToolbar({ 
  activeTool, 
  onToolChange, 
  showTerrain,
  onToggleTerrain,
  onCycleStyle
}: MapToolbarProps) {
  const [position, setPosition] = useState({ x: 24, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: 24, y: window.innerHeight / 2 - 100 });
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      className={styles.toolbar} 
      ref={toolbarRef}
      style={{ left: `${position.x}px`, top: `${position.y}px`, transform: 'none' }}
    >
      <div 
        className={styles.dragHandle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Drag Toolbar"
      >
        <GripHorizontal size={20} />
      </div>

      <div className={styles.divider}></div>

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
    </div>
  );
}

