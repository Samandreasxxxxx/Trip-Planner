import React from 'react';
import styles from './Sidebar.module.css';
import { Compass, Map as MapIcon, Menu, Sun, Moon } from 'lucide-react';

interface SidebarProps {
  onToggleTripPanel: () => void;
  isPanelOpen: boolean;
}

export default function Sidebar({ onToggleTripPanel, isPanelOpen }: SidebarProps) {
  const [isLight, setIsLight] = React.useState(false);

  const toggleTheme = () => {
    setIsLight(!isLight);
    document.body.classList.toggle('light');
  };

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
        <button className={`${styles.navItem} ${styles.active}`} title="Adventure Planner">
          <MapIcon size={24} />
        </button>
      </nav>
      
      <div className={styles.quoteSection}>
        <p>&quot;To travel is to live.&quot;</p>
        <small>– Hans Christian Andersen</small>
      </div>
      <div className={styles.bottom}>
        <button 
          className={styles.themeButton} 
          onClick={toggleTheme}
          title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {isLight ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </aside>
  );
}
