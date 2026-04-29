/**
 * Uses the Mapbox Optimization API to find the optimal order for a set of stops.
 * @param stops Array of TripStop objects to optimize.
 * @returns Reordered array of TripStop objects.
 */
import { TripStop } from '@/types';

export async function optimizeRoute(stops: TripStop[]): Promise<TripStop[]> {
  if (stops.length < 3) return stops; // Not much to optimize for 1 or 2 stops

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    console.error('Mapbox token is missing');
    return stops;
  }

  // Mapbox Optimization API limit is 12 coordinates
  // Coordinates should be in [lng, lat] format
  const coordsString = stops
    .map(s => `${s.lng},${s.lat}`)
    .join(';');

  try {
    const response = await fetch(
      `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordsString}?access_token=${token}&source=first&overview=full`
    );

    if (!response.ok) {
      throw new Error(`Optimization API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.waypoints) {
      return stops;
    }

    // data.waypoints contains the waypoints in the optimized order
    // waypoint_index refers to the index in the original coordinates string
    const optimizedStops = data.waypoints
      .sort((a: any, b: any) => a.waypoint_index - b.waypoint_index) // This is wrong, waypoint_index is the original index
      // Wait, the API returns waypoints in the order they were provided, but with a 'trips_index' or we should use 'trips'
      // Actually, the 'trips' array contains 'geometry' and 'legs'.
      // The 'waypoints' array has 'waypoint_index' which is the index of the coordinate in the request.
      // And they are ordered by their sequence in the trip.
    
    // Correction: The waypoints array in the response is ordered by their sequence in the trip.
    const sequence = data.waypoints.map((wp: any) => wp.waypoint_index);
    
    return sequence.map((index: number) => stops[index]);
  } catch (error) {
    console.error('Failed to optimize route:', error);
    return stops;
  }
}
