/**
 * Fetches driving directions between a list of coordinates using the Mapbox Directions API.
 * @param coordinates Array of [longitude, latitude] pairs.
 * @returns Array of coordinates representing the path.
 */
export async function fetchDirections(
  coordinates: [number, number][], 
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<[number, number][]> {
  if (coordinates.length < 2) return [];

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    console.error('Mapbox token is missing');
    return coordinates; // Fallback to straight lines
  }

  // Mapbox Directions API limit is 25 coordinates
  // For simplicity, we just take the first 25 if there are more
  const coordsString = coordinates
    .slice(0, 25)
    .map(c => c.join(','))
    .join(';');

  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordsString}?geometries=geojson&access_token=${token}&overview=full`
    );

    if (!response.ok) {
      throw new Error(`Directions API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return coordinates; // Fallback
    }

    return data.routes[0].geometry.coordinates;
  } catch (error) {
    console.error('Failed to fetch directions:', error);
    return coordinates; // Fallback to straight lines
  }
}
