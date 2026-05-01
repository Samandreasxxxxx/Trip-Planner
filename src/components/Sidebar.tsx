import React from 'react';
import styles from './Sidebar.module.css';
import { Compass, Map as MapIcon, Menu, Sun, Moon } from 'lucide-react';

interface SidebarProps {
  onToggleTripPanel: () => void;
  isPanelOpen: boolean;
  userName: string;
  onLogout: () => void;
}

export default function Sidebar({ onToggleTripPanel, isPanelOpen, userName, onLogout }: SidebarProps) {
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
        <button 
          className={styles.navItem} 
          title="Share My Journey"
          onClick={() => {
            const btn = document.querySelector('[title="Share Trip"]') as HTMLButtonElement;
            if (btn) btn.click();
            else alert("Add some stops to share your trip!");
          }}
        >
          <Compass size={24} />
        </button>
        <button 
          className={styles.navItem} 
          title="Fix My Route (AI Optimize)"
          onClick={() => {
            const btn = document.querySelector('[title="Fix My Whole Route (Global Optimization)"]') as HTMLButtonElement;
            if (btn) btn.click();
          }}
        >
          <Sparkles size={24} style={{color: '#10b981'}} />
        </button>
      </nav>
      
      <div className={styles.quoteSection}>
        <p>&quot;To travel is to live.&quot;</p>
        <small>– Hans Christian Andersen</small>
      </div>
      <div className={styles.bottom}>
        {userName && (
          <div className={styles.profileBadge} title={`Logged in as ${userName}`}>
            <div className={styles.avatar}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <button className={styles.logoutBtn} onClick={onLogout} title="Logout">
              <X size={12} />
            </button>
          </div>
        )}
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
