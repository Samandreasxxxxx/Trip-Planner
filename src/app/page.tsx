import Map from '@/components/Map';
import Sidebar from '@/components/Sidebar';
import TripPanel from '@/components/TripPanel';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <Sidebar />
      <div className={styles.mapArea}>
        <Map />
      </div>
      <TripPanel />
    </main>
  );
}
