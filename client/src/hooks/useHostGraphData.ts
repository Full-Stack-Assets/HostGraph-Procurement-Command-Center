import { useEffect, useState } from 'react';
import { configuredHostGraphMode } from '@/lib/runtimeMode';
import {
  applyReadFailure,
  applyReadLoading,
  applyReadSuccess,
  createInitialReadState,
  type HostGraphReadState,
} from '@/lib/dataReadState';

interface UseHostGraphDataOptions<T> {
  fallbackData: T;
  dependencies?: readonly unknown[];
  enabled?: boolean;
  configuredMode?: 'DEMO' | 'LIVE';
}

export class HostGraphLiveDataUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HostGraphLiveDataUnavailableError';
  }
}

export function useHostGraphData<T>(
  fetcher: () => Promise<T>,
  {
    fallbackData,
    dependencies = [],
    enabled = true,
    configuredMode = configuredHostGraphMode,
  }: UseHostGraphDataOptions<T>,
) {
  const [state, setState] = useState<HostGraphReadState<T>>(() =>
    createInitialReadState(configuredMode, fallbackData),
  );

  useEffect(() => {
    if (configuredMode === 'DEMO') {
      setState(createInitialReadState('DEMO', fallbackData));
      return;
    }

    if (!enabled) {
      setState((current) => ({ ...current, status: 'ready' }));
      return;
    }

    let cancelled = false;
    setState((current) => applyReadLoading(current.configuredMode === configuredMode ? current : createInitialReadState(configuredMode, fallbackData)));

    void fetcher()
      .then((result) => {
        if (!cancelled) {
          setState((current) => applyReadSuccess(current, result, new Date().toISOString()));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Live source unavailable';
          setState((current) => applyReadFailure(current, message));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [configuredMode, enabled, fallbackData, ...dependencies]);

  if (state.mode === 'DEGRADED' && state.data === null && state.status === 'error') {
    throw new HostGraphLiveDataUnavailableError(
      `Live source degraded — no synthetic substitution. ${state.error ?? 'No verified live snapshot is available.'}`,
    );
  }

  return {
    data: state.data as T,
    loading: state.status === 'loading',
    error: state.error,
    usingFallback: state.mode === 'DEMO',
    mode: state.mode,
    fetchedAt: state.fetchedAt,
    stale: state.stale,
  };
}
