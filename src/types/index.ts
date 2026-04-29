export interface TripStop {
  id: string;
  lng: number;
  lat: number;
  title: string;
  description?: string;
  dayNumber: number;
  startTime?: string;
  category?: 'hotel' | 'restaurant' | 'sightseeing' | 'transport' | 'other';
}
