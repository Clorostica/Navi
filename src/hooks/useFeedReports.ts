import { useEffect, useRef, useState } from 'react';
import { fetchFeed } from '../lib/reports';
import type { Report } from '../types';

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 30_000;

export function useFeedReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const reportsRef = useRef<Report[]>([]);
  reportsRef.current = reports;

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const page = await fetchFeed({ limit: PAGE_SIZE });
      if (cancelled) return;
      setReports((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const fresh = page.filter((r) => !existingIds.has(r.id));
        if (fresh.length === 0) return prev;
        return [...fresh, ...prev].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
    };

    (async () => {
      setLoading(true);
      const page = await fetchFeed({ limit: PAGE_SIZE });
      if (cancelled) return;
      setReports(page);
      setHasMore(page.length === PAGE_SIZE);
      setLoading(false);
    })();

    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const loadMore = async () => {
    const oldest = reportsRef.current[reportsRef.current.length - 1];
    if (loadingMore || !hasMore || !oldest) return;
    setLoadingMore(true);
    const page = await fetchFeed({ limit: PAGE_SIZE, before: oldest.createdAt });
    setReports((prev) => [...prev, ...page]);
    setHasMore(page.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  return { reports, loading, loadingMore, hasMore, loadMore };
}
