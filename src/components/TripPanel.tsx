import React, { useState } from 'react';
import styles from './TripPanel.module.css';
import { Plus, Calendar, MapPin, Trash2, X } from 'lucide-react';
import { TripStop } from '@/types';

interface TripPanelProps {
  stops: TripStop[];
  selectedLocation: { lng: number; lat: number } | null;
  onAddStop: (title: string, description: string) => void;
  onRemoveStop: (id: string) => void;
  onCancelSelection: () => void;
}

export default function TripPanel({ 
  stops, 
  selectedLocation, 
  onAddStop, 
  onRemoveStop,
  onCancelSelection 
}: TripPanelProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!title.trim()) return;
    onAddStop(title, description);
    setTitle('');
    setDescription('');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Trip Plan</h2>
      </div>

      <div className={styles.content}>
        {selectedLocation && (
          <div className={styles.addForm}>
            <div className={styles.formHeader}>
              <h3>Add New Stop</h3>
              <button onClick={onCancelSelection} className={styles.iconButton}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.coords}>
              {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </div>
            
            <input 
              type="text" 
              placeholder="Stop Name (e.g. Eiffel Tower)" 
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
            
            <textarea 
              placeholder="Notes or Description" 
              className={styles.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
            
            <button 
              className={styles.primaryButton} 
              onClick={handleAdd}
              disabled={!title.trim()}
            >
              Add to Itinerary
            </button>
          </div>
        )}

        {!selectedLocation && stops.length === 0 && (
          <div className={styles.emptyState}>
            <MapPin size={48} className={styles.emptyIcon} />
            <h3>No stops added yet</h3>
            <p>Click anywhere on the map to start planning your itinerary.</p>
          </div>
        )}

        <div className={styles.stopsList}>
          {stops.map((stop, index) => (
            <div key={stop.id} className={styles.stopCard}>
              <div className={styles.stopNumber}>{index + 1}</div>
              <div className={styles.stopInfo}>
                <h4>{stop.title}</h4>
                {stop.description && <p>{stop.description}</p>}
              </div>
              <button 
                className={styles.deleteButton}
                onClick={() => onRemoveStop(stop.id)}
                title="Remove Stop"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.saveButton} onClick={() => alert('Saved locally! Supabase sync coming soon.')}>
          Save Itinerary
        </button>
      </div>
    </div>
  );
}
