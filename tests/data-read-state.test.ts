import { describe, expect, it } from 'vitest';
import {
  applyReadFailure,
  applyReadSuccess,
  createInitialReadState,
} from '@/lib/dataReadState';
import { resolveConfiguredMode } from '@/lib/runtimeMode';

describe('HostGraph source-honest read state', () => {
  it('resolves only DEMO or LIVE as configured modes', () => {
    expect(resolveConfiguredMode('DEMO')).toBe('DEMO');
    expect(resolveConfiguredMode('LIVE')).toBe('LIVE');
    expect(resolveConfiguredMode('anything-else')).toBe('DEMO');
  });

  it('starts DEMO from synthetic fixture data without probing live sources', () => {
    const state = createInitialReadState('DEMO', { value: 'fixture' });
    expect(state.mode).toBe('DEMO');
    expect(state.data).toEqual({ value: 'fixture' });
    expect(state.lastVerifiedData).toBeNull();
  });

  it('starts LIVE with no fixture data', () => {
    const state = createInitialReadState('LIVE', { value: 'fixture' });
    expect(state.mode).toBe('LIVE');
    expect(state.data).toBeNull();
    expect(state.lastVerifiedData).toBeNull();
  });

  it('promotes a successful live read to verified live state', () => {
    const initial = createInitialReadState('LIVE', { value: 'fixture' });
    const live = applyReadSuccess(initial, { value: 'vendor-api' }, '2026-08-25T20:00:00.000Z');
    expect(live.mode).toBe('LIVE');
    expect(live.data).toEqual({ value: 'vendor-api' });
    expect(live.lastVerifiedData).toEqual({ value: 'vendor-api' });
  });

  it('degrades to null after a live failure when no verified snapshot exists', () => {
    const initial = createInitialReadState('LIVE', { value: 'fixture' });
    const degraded = applyReadFailure(initial, 'upstream unavailable');
    expect(degraded.mode).toBe('DEGRADED');
    expect(degraded.data).toBeNull();
    expect(degraded.error).toBe('upstream unavailable');
  });

  it('degrades to the last verified live snapshot, never the fixture', () => {
    const initial = createInitialReadState('LIVE', { value: 'fixture' });
    const live = applyReadSuccess(initial, { value: 'verified-live' }, '2026-08-25T20:00:00.000Z');
    const degraded = applyReadFailure(live, 'timeout');
    expect(degraded.mode).toBe('DEGRADED');
    expect(degraded.data).toEqual({ value: 'verified-live' });
    expect(degraded.data).not.toEqual({ value: 'fixture' });
  });
});
