import { useEffect, useState } from 'react';

import { resolveProtectedMediaUrl } from './diagnosisApi';

interface ProtectedMediaState {
  url: string;
  isLoading: boolean;
  error: string;
}

export function useProtectedMediaUrl(source?: string | null): ProtectedMediaState {
  const [state, setState] = useState<ProtectedMediaState>({
    url: '',
    isLoading: Boolean(source),
    error: ''
  });

  useEffect(() => {
    let cancelled = false;

    if (!source) {
      setState({ url: '', isLoading: false, error: '' });
      return () => {
        cancelled = true;
      };
    }

    setState((prev) => ({ ...prev, isLoading: true, error: '' }));

    void resolveProtectedMediaUrl(source)
      .then((resolved) => {
        if (!cancelled) {
          setState({ url: resolved, isLoading: false, error: '' });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            url: '',
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unable to load protected media.'
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  return state;
}
