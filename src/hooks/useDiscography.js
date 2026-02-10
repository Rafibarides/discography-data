import { useState, useEffect, useCallback } from 'react';
import { fetchFromSheet, getCachedData, setCachedData, clearCache } from '../utils/api';
import { buildDatabase } from '../utils/analytics';

export function useDiscography() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) {
        try {
          const built = buildDatabase(cached);
          setDb(built);
          setLoading(false);
          return;
        } catch (e) {
          console.warn('Cache parse failed, fetching fresh:', e);
        }
      }
    }

    try {
      const raw = await fetchFromSheet();
      setCachedData(raw);
      const built = buildDatabase(raw);
      setDb(built);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    clearCache();
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { db, loading, error, refresh, reload: loadData };
}
