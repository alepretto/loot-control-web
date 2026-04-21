import { useState, useEffect, useCallback } from 'react';

// Hook para debounce de valores (útil para busca)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para debounce de funções (útil para callbacks)
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const id = setTimeout(() => {
        callback(...args);
      }, delay);

      setTimeoutId(id);
    },
    [callback, delay, timeoutId]
  );
}

// Hook específico para busca com debounce e loading state
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T>,
  delay = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debouncedQuery = useDebounce(query, delay);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    searchFn(debouncedQuery)
      .then(setResults)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [debouncedQuery, searchFn]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
  };
}
