import React from 'react';
import styles from './TripPanel.module.css';
import { MapPin, Trash2, Navigation } from 'lucide-react';
import { TripStop } from '@/types';
import { calculateDistance } from '@/utils/distance';

interface TripPanelProps {
  stops: TripStop[];
  onRemoveStop: (id: string) => void;
  onUpdateStop: (id: string, updates: Partial<TripStop>) => void;
  onStopClick: (lng: number, lat: number, id: string) => void;
}

export default function TripPanel({ 
  stops, 
  onRemoveStop,
  onUpdateStop,
  onStopClick
}: TripPanelProps) {

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Trip Plan</h2>
      </div>

      <div className={styles.content}>
        {stops.length === 0 && (
          <div className={styles.emptyState}>
            <MapPin size={48} className={styles.emptyIcon} />
            <h3>No stops added yet</h3>
            <p>Press Alt+A to select the Pin tool, then click the map to add a stop.</p>
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
                    <Navigation size={14} />
                    <span>{distanceToPrev.toFixed(1)} km to next stop</span>
                  </div>
                )}
                <div 
                  className={styles.stopCard} 
                  onClick={() => onStopClick(stop.lng, stop.lat, stop.id)}
                >
                  <div className={styles.stopNumber}>{index + 1}</div>
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
                      placeholder="Add comments about this stop..."
                      rows={2}
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
                    <Trash2 size={18} />
                  </button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.saveButton} onClick={() => alert('Saved locally!')}>
          Save Itinerary
        </button>
      </div>
    </div>
  );
}
