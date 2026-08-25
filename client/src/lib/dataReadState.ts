import type { ConfiguredTruthMode, TruthMode } from '@shared/contracts/core';

export interface HostGraphReadState<T> {
  configuredMode: ConfiguredTruthMode;
  mode: TruthMode;
  status: 'ready' | 'loading' | 'error';
  data: T | null;
  lastVerifiedData: T | null;
  error: string | null;
  fetchedAt: string | null;
  stale: boolean;
}

export function createInitialReadState<T>(
  configuredMode: ConfiguredTruthMode,
  demoData: T,
): HostGraphReadState<T> {
  if (configuredMode === 'DEMO') {
    return {
      configuredMode,
      mode: 'DEMO',
      status: 'ready',
      data: demoData,
      lastVerifiedData: null,
      error: null,
      fetchedAt: null,
      stale: false,
    };
  }

  return {
    configuredMode,
    mode: 'LIVE',
    status: 'loading',
    data: null,
    lastVerifiedData: null,
    error: null,
    fetchedAt: null,
    stale: false,
  };
}

export function applyReadLoading<T>(state: HostGraphReadState<T>): HostGraphReadState<T> {
  if (state.configuredMode === 'DEMO') return state;
  return { ...state, status: 'loading', error: null };
}

export function applyReadSuccess<T>(
  state: HostGraphReadState<T>,
  data: T,
  fetchedAt: string,
): HostGraphReadState<T> {
  if (state.configuredMode === 'DEMO') return state;
  return {
    configuredMode: 'LIVE',
    mode: 'LIVE',
    status: 'ready',
    data,
    lastVerifiedData: data,
    error: null,
    fetchedAt,
    stale: false,
  };
}

export function applyReadFailure<T>(
  state: HostGraphReadState<T>,
  error: string,
): HostGraphReadState<T> {
  if (state.configuredMode === 'DEMO') return state;
  return {
    ...state,
    mode: 'DEGRADED',
    status: 'error',
    data: state.lastVerifiedData,
    error,
    stale: state.lastVerifiedData !== null,
  };
}
