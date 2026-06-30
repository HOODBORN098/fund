import { useState, useEffect, useCallback } from 'react';

/**
 * useApi — fire an async API function and track loading/error/data.
 *
 * const { data, loading, error, refetch } = useApi(() => roscaApi.list(chamaId), [chamaId]);
 */
export function useApi(fn, deps = []) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * useMutation — fire a one-shot action (post/patch/delete) with loading/error state.
 *
 * const { mutate, loading, error } = useMutation((id) => welfareApi.approve(chamaId, id));
 */
export function useMutation(fn) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      setData(result);
      return result;
    } catch (e) {
      setError(e.message || 'Something went wrong');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [fn]);

  return { mutate, loading, error, data };
}
