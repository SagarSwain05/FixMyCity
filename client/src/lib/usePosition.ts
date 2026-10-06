import { useEffect, useState } from "react";
import { DEFAULT_CENTER, getCurrentPosition, type LatLng } from "./geo";

let cached: LatLng | null = null;

// Resolves the user's position once per session; falls back to the city centre.
export function usePosition() {
  const [position, setPosition] = useState<LatLng | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    getCurrentPosition()
      .then((p) => {
        cached = p;
        setPosition(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { position, center: position ?? DEFAULT_CENTER, error, loading, isFallback: !position };
}
