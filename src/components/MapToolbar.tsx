import { MapPin, MousePointer2, Globe, GripHorizontal } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import styles from './MapToolbar.module.css';

interface MapToolbarProps {
  activeTool: 'select' | 'pin';
  onToolChange: (tool: 'select' | 'pin') => void;
  mapStyle: string;
  onCycleStyle: () => void;
  onFitAll: () => void;
}

export default function MapToolbar({ 
  activeTool, 
  onToolChange, 
  mapStyle,
  onCycleStyle,
  onFitAll
}: MapToolbarProps) {
  const [position, setPosition] = useState({ right: 24, top: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        ...prev,
        top: Math.min(prev.top, window.innerHeight - 300)
      }));
    };
    
    if (typeof window !== 'undefined') {
      setPosition({ right: 24, top: window.innerHeight / 2 - 100 });
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPosition(prev => ({
        right: prev.right - e.movementX,
        top: prev.top + e.movementY
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
      style={{ right: `${position.right}px`, top: `${position.top}px`, transform: 'none', left: 'auto' }}
    >
      <div 
        className={styles.dragHandle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Drag Toolbar"
      >
        <GripHorizontal size={14} />
      </div>

      <div className={styles.divider}></div>

      <button 
        className={`${styles.toolButton} ${activeTool === 'select' ? styles.active : ''}`}
        onClick={() => onToolChange('select')}
        title="Selection Tool (Alt+H)"
      >
        <MousePointer2 size={16} />
      </button>
      
      <button 
        className={`${styles.toolButton} ${activeTool === 'pin' ? styles.activePin : ''}`}
        onClick={() => onToolChange('pin')}
        title="Drop Pin tool (Alt+A)"
      >
        <MapPin size={16} />
        <span className={styles.toolLabel}>Pin</span>
      </button>

      <div className={styles.divider}></div>


      <button 
        className={styles.toolButton}
        onClick={onCycleStyle}
        title="Cycle Map Style"
      >
        <Globe size={16} />
      </button>

      <div className={styles.divider}></div>

      <button 
        className={styles.toolButton}
        onClick={onFitAll}
        title="Zoom to All Stops"
      >
        <div style={{ transform: 'scale(0.8)' }}><Globe size={20} /></div>
      </button>

    </div>
  );
}

