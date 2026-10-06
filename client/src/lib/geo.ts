export interface LatLng {
  lat: number;
  lng: number;
}

const [defLat, defLng] = (import.meta.env.VITE_DEFAULT_CENTER || "20.2961,85.8245").split(",").map(Number);
export const DEFAULT_CENTER: LatLng = { lat: defLat, lng: defLng }; // Bhubaneswar

export function getCurrentPosition(timeout = 10000): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Geolocation is not supported by this browser"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Enable it in your browser settings or drop the pin on the map."
              : "Could not get your location. Drop the pin on the map instead."
          )
        ),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 }
    );
  });
}

export interface ReverseGeocode {
  address: string;
  ward?: string;
}

// OpenStreetMap Nominatim; best effort, falls back to raw coordinates.
export async function reverseGeocode({ lat, lng }: LatLng): Promise<ReverseGeocode> {
  const fallback = { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const a = data.address || {};
    return {
      address: data.display_name || fallback.address,
      ward: a.suburb || a.neighbourhood || a.city_district || a.quarter || a.village || a.town || undefined,
    };
  } catch {
    return fallback;
  }
}

export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
