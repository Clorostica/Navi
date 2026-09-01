import { useEffect, useState } from 'react';

export interface GeoPosition {
  lat: number;
  lon: number;
}

// Only watches while `active` is true — callers decide when the permission
// prompt and continued GPS polling are worth it (e.g. while a route is open,
// or for as long as a screen that needs live position stays mounted).
export function useGeolocation(active: boolean): GeoPosition | null {
  const [position, setPosition] = useState<GeoPosition | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.geolocation) {
      setPosition(null);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setPosition(null),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setPosition(null);
    };
  }, [active]);

  return position;
}
