import { describe, expect, it } from 'vitest';
import {
  mergeQueueItems,
  normalizeQueueItem,
  queueIdentity,
} from '@/features/invoices/queue';

describe('auditable invoice queue normalization', () => {
  it('uses stable job ID before server ID', () => {
    expect(queueIdentity({ id: 'server-1', jobId: 'job-1' })).toBe('job-1');
    expect(queueIdentity({ id: 'server-1' })).toBe('server-1');
  });

  it('does not create a new identity when the same live job advances state', () => {
    const first = normalizeQueueItem({ jobId: 'job-1', status: 'parsing', fileName: 'a.pdf' });
    const second = normalizeQueueItem({ jobId: 'job-1', status: 'review', fileName: 'a.pdf' }, first);
    expect(second.id).toBe(first.id);
    expect(second.state).toBe('NEEDS_REVIEW');
  });

  it('maps upstream completed to NEEDS_REVIEW unless explicit reviewer verification exists', () => {
    expect(normalizeQueueItem({ jobId: 'job-2', status: 'completed' }).state).toBe('NEEDS_REVIEW');
    expect(
      normalizeQueueItem({
        jobId: 'job-3',
        status: 'completed',
        reviewerId: 'reviewer-1',
        reviewedAt: '2026-08-25T20:00:00.000Z',
        verified: true,
      }).state,
    ).toBe('VERIFIED');
  });

  it('preserves checksum, reviewer evidence, and source references during merge', () => {
    const existing = normalizeQueueItem({
      jobId: 'job-4',
      status: 'review',
      checksumSha256: 'a'.repeat(64),
      reviewerId: 'reviewer-1',
      sourceRecordIds: ['source-1'],
    });
    const update = normalizeQueueItem({ jobId: 'job-4', status: 'parsing' }, existing);
    const merged = mergeQueueItems([update], [existing]);
    expect(merged).toHaveLength(1);
    expect(merged[0].checksumSha256).toBe('a'.repeat(64));
    expect(merged[0].reviewerId).toBe('reviewer-1');
    expect(merged[0].sourceRecordIds).toEqual(['source-1']);
  });
});
