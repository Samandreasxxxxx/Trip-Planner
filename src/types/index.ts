export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit';

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
  links?: string[];
  paidBy?: string;
  splitAmong?: string[];
  rating?: number;
  bestTime?: string;
  bestTransport?: string;
  proTip?: string;
  imageUrl?: string;
}

export interface Trip {
  id: string;
  name: string;
  stops: TripStop[];
  createdAt: number;
  participants?: string[];
}

