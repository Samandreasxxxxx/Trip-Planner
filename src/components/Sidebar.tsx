import React from 'react';
import styles from './Sidebar.module.css';
import { Compass, Map as MapIcon, Settings, User } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
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
