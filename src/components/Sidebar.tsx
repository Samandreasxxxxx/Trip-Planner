import React from 'react';
import styles from './Sidebar.module.css';
import { Compass, Map as MapIcon, Settings, User, Menu } from 'lucide-react';

interface SidebarProps {
  onToggleTripPanel: () => void;
  isPanelOpen: boolean;
}

export default function Sidebar({ onToggleTripPanel, isPanelOpen }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <button 
          className={`${styles.menuButton} ${isPanelOpen ? styles.active : ''}`} 
          onClick={onToggleTripPanel}
          title={isPanelOpen ? "Hide Trip Plan" : "Show Trip Plan"}
        >
          <Menu size={24} />
        </button>
        <Compass size={32} className={styles.logoIcon} />
      </div>
      <nav className={styles.nav}>
        <button className={`${styles.navItem} ${styles.active}`} title="Trip Planner">
          <MapIcon size={24} />
        </button>
        <button className={styles.navItem} title="User Profile">
          <User size={24} />
        </button>
        <button className={styles.navItem} title="Settings">
          <Settings size={24} />
        </button>
      </nav>
    </aside>
  );
}
