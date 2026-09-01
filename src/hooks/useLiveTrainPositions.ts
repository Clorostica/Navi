import { useEffect, useState } from 'react';
import { apiFetchLiveTrains, type LiveTrain } from '../lib/api';
import type { MapBounds } from '../data/mapProjection';

export function useLiveTrainPositions(bounds: MapBounds, intervalMs = 15000): LiveTrain[] {
  const [trains, setTrains] = useState<LiveTrain[]>([]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      const next = await apiFetchLiveTrains(bounds);
      if (!cancelled) setTrains(next);
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(poll, intervalMs);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        poll();
        start();
      }
    };

    poll();
    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [bounds, intervalMs]);

  return trains;
}
