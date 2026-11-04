/**
 * Hook reutilizable para polling y refresco periódico de datos
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>;
  intervalMs?: number;
  enabled?: boolean;
}

export function usePolling<T>({ fetcher, intervalMs = 10000, enabled = true }: UsePollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Ejecución inicial
    execute(true);

    const interval = setInterval(() => {
      execute(false);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, intervalMs, execute]);

  const refresh = useCallback(() => {
    return execute(false);
  }, [execute]);

  return { data, loading, error, refresh };
}
