import { useState, useCallback, useEffect } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAsyncOptions {
  immediate?: boolean;
}

/**
 * Generic hook for async operations
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { immediate = true } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      setState((prev) => ({ ...prev, loading: false, error }));
      throw e;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData: (data: T | null) => setState((prev) => ({ ...prev, data })),
  };
}

/**
 * Hook for async mutations (create, update, delete)
 */
export function useMutation<TData, TVariables>(
  mutationFunction: (variables: TVariables) => Promise<TData>
) {
  const [state, setState] = useState<AsyncState<TData>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (variables: TVariables) => {
      setState({ data: null, loading: true, error: null });

      try {
        const data = await mutationFunction(variables);
        setState({ data, loading: false, error: null });
        return data;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        setState((prev) => ({ ...prev, loading: false, error }));
        throw e;
      }
    },
    [mutationFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}
