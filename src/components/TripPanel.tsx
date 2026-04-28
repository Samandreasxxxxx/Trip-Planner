import React from 'react';
import styles from './TripPanel.module.css';
import { Plus, Calendar, MapPin } from 'lucide-react';

export default function TripPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Trip Plan</h2>
        <button className={styles.addButton}>
          <Plus size={20} />
          <span>Add Stop</span>
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.emptyState}>
          <MapPin size={48} className={styles.emptyIcon} />
          <h3>No stops added yet</h3>
          <p>Click the map or the add button above to start planning your itinerary.</p>
        </div>

        {/* Drop your dynamic list of trip stops here */}
      </div>

      <div className={styles.footer}>
        <button className={styles.saveButton}>
          Save Itinerary
        </button>
      </div>
    </div>
  );
}
