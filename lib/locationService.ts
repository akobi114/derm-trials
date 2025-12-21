// --- 1. THE STATE DICTIONARY ---
// Ported from TrialResultsList.tsx
export const STATE_MAP: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia"
};

// --- 2. COORDINATE MATH (Haversine) ---
// Ported from TrialClientLogic.tsx
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

// --- 3. ZIP CODE LOOKUP ---
// Centralized fetch logic used in both files
export async function getZipCoordinates(zip: string) {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      lat: parseFloat(data.places[0].latitude),
      lon: parseFloat(data.places[0].longitude),
      stateAbbr: data.places[0]['state abbreviation'],
      city: data.places[0]['place name']
    };
  } catch (err) {
    console.error("Zip lookup failed:", err);
    return null;
  }
}

// --- 4. SMART LOCATION AGGREGATOR ---
// Ported/Improved from TrialResultsList.tsx for the Wide Card
export function getSmartLocationString(locations: any[], userLat?: number | null, userLon?: number | null, radius: number = 100): string {
  if (!locations || locations.length === 0) return "Nationwide / Multiple Locations";

  // If we have coordinates, find the ones within the radius
  if (userLat && userLon) {
    const nearbySites = locations.filter(loc => {
      const lat = loc.lat || loc.latitude || loc.geoPoint?.lat;
      const lon = loc.long || loc.longitude || loc.geoPoint?.lon;
      if (!lat || !lon) return false;
      return calculateDistance(userLat, userLon, parseFloat(lat), parseFloat(lon)) <= radius;
    });

    if (nearbySites.length > 0) {
      const uniqueCities = Array.from(new Set(nearbySites.map(s => s.city.trim())));
      const count = uniqueCities.length;
      const otherCount = locations.length - nearbySites.length;

      if (count === 1) {
        return `${uniqueCities[0]}, ${nearbySites[0].state}${otherCount > 0 ? ` (+${otherCount} other sites)` : ''}`;
      }
      return `${uniqueCities[0]}, ${uniqueCities[1]}${count > 2 ? ` (+${count - 2 + otherCount} others)` : ` (+${otherCount} others)`}`;
    }
  }

  // Fallback: If no coordinates or no nearby matches, show the first available site
  return `${locations[0].city}, ${locations[0].state}${locations.length > 1 ? ` (+${locations.length - 1} others)` : ''}`;
}