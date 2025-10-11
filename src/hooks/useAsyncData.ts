import { useEffect, useRef } from 'react';

interface UseAsyncDataOptions<T> {
  queryFn: (signal?: AbortSignal) => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  dependencies?: any[];
  setLoading?: (loading: boolean) => void;
}

export function useAsyncData<T>({
  queryFn,
  onSuccess,
  onError,
  dependencies = [],
}: UseAsyncDataOptions<T>) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const data = await queryFn(controller.signal);
      onSuccess?.(data);
    } catch (error) {
      // Only handle non-abort errors
      if (error instanceof Error && error.name !== 'AbortError') {
        onError?.(error);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  return { refetch: fetchData };
}