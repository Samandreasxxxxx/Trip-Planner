import React from 'react';
import { MapPin, MousePointer2 } from 'lucide-react';
import styles from './MapToolbar.module.css';

interface MapToolbarProps {
  activeTool: 'select' | 'pin';
  onToolChange: (tool: 'select' | 'pin') => void;
}

export default function MapToolbar({ activeTool, onToolChange }: MapToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button 
        className={`${styles.toolButton} ${activeTool === 'select' ? styles.active : ''}`}
        onClick={() => onToolChange('select')}
        title="Selection Tool"
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
    </div>
  );
}
