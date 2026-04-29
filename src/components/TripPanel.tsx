import React, { useMemo } from 'react';
import styles from './TripPanel.module.css';
import { MapPin, Trash2, Navigation, ChevronLeft, ChevronUp, ChevronDown, Trash } from 'lucide-react';
import { TripStop } from '@/types';
import { calculateDistance } from '@/utils/distance';

interface TripPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stops: TripStop[];
  onRemoveStop: (id: string) => void;
  onUpdateStop: (id: string, updates: Partial<TripStop>) => void;
  onStopClick: (lng: number, lat: number, id: string) => void;
  onReorderStops: (stops: TripStop[]) => void;
  onClearAll: () => void;
}

export default function TripPanel({ 
  isOpen,
  onClose,
  stops, 
  onRemoveStop,
  onUpdateStop,
  onStopClick,
  onReorderStops,
  onClearAll
}: TripPanelProps) {

  const totalDistance = useMemo(() => {
    let total = 0;
    for (let i = 1; i < stops.length; i++) {
      total += calculateDistance(stops[i-1].lat, stops[i-1].lng, stops[i].lat, stops[i].lng);
    }
    return total;
  }, [stops]);

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newStops = [...stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;
    
    [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
    onReorderStops(newStops);
  };

  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2 className={styles.title}>Your Trip Plan</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <ChevronLeft size={20} />
          </button>
        </div>
        {stops.length > 0 && (
          <div className={styles.headerStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stops.length}</span>
              <span className={styles.statLabel}>Stops</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{totalDistance.toFixed(0)}</span>
              <span className={styles.statLabel}>Total km</span>
            </div>
            <button className={styles.clearAllButton} onClick={onClearAll} title="Clear All">
              <Trash size={16} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {stops.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <MapPin size={40} className={styles.emptyIcon} />
            </div>
            <h3>No stops added yet</h3>
            <p>Press <span className={styles.shortcut}>Alt + A</span> to select the Pin tool, then click the map to add a stop.</p>
          </div>
        )}

        <div className={styles.stopsList}>
          {stops.map((stop, index) => {
            let distanceToPrev = 0;
            if (index > 0) {
              const prev = stops[index - 1];
              distanceToPrev = calculateDistance(prev.lat, prev.lng, stop.lat, stop.lng);
            }

            return (
              <React.Fragment key={stop.id}>
                {index > 0 && (
                  <div className={styles.distanceIndicator}>
                    <div className={styles.line}></div>
                    <div className={styles.distanceBadge}>
                      <Navigation size={12} />
                      <span>{distanceToPrev.toFixed(1)} km</span>
                    </div>
                  </div>
                )}
                <div 
                  className={styles.stopCard} 
                  onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
                >
                  <div className={styles.stopCardLeft}>
                    <div className={styles.stopNumber}>{index + 1}</div>
                    <div className={styles.reorderButtons}>
                      <button 
                        disabled={index === 0} 
                        onClick={(e) => { e.stopPropagation(); moveStop(index, 'up'); }}
                        className={styles.reorderBtn}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        disabled={index === stops.length - 1} 
                        onClick={(e) => { e.stopPropagation(); moveStop(index, 'down'); }}
                        className={styles.reorderBtn}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.stopInfo} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="text"
                      className={styles.inlineInputTitle}
                      value={stop.title}
                      onChange={(e) => onUpdateStop(stop.id, { title: e.target.value })}
                      placeholder="Stop Name"
                      onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
                    />
                    <textarea 
                      className={styles.inlineInputDesc}
                      value={stop.description || ''}
                      onChange={(e) => onUpdateStop(stop.id, { description: e.target.value })}
                      placeholder="Add comments..."
                      rows={1}
                      onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
                    />
                  </div>
                  <button 
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStop(stop.id);
                    }}
                    title="Remove Stop"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.saveButton} onClick={() => window.print()}>
          Print Itinerary
        </button>
      </div>
    </div>
  );
}
