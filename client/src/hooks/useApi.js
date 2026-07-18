import { useCallback, useEffect, useState } from "react";

export function useApi(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const refetch = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fn()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => refetch(), [refetch]);

  return { ...state, refetch };
}
