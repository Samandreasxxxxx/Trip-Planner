export type TravelMode = 'driving' | 'walking' | 'cycling';

export interface TripStop {
  id: string;
  lng: number;
  lat: number;
  title: string;
  description?: string;
  dayNumber: number;
  startTime?: string;
  category?: 'hotel' | 'restaurant' | 'sightseeing' | 'transport' | 'other';
  cost?: number;
  emoji?: string;
}

export interface Trip {
  id: string;
  name: string;
  stops: TripStop[];
  createdAt: number;
}
