import type { InvoiceState } from '@shared/contracts/invoices';

export interface InvoiceQueueRecord {
  id: string;
  jobId?: string;
  state: InvoiceState;
  fileName: string;
  uploadedAt: string;
  source: 'upload' | 'email' | 'erp' | 'vendor-api';
  location: string;
  vendor: string;
  documentType: string;
  detail: string;
  checksumSha256?: string;
  reviewerId?: string;
  reviewedAt?: string;
  sourceRecordIds: string[];
}

export interface UpstreamQueueItem {
  id?: string;
  jobId?: string;
  status?: string;
  parsingStatus?: string;
  state?: string;
  fileName?: string;
  uploadedAt?: string;
  source?: string;
  location?: string;
  vendor?: string;
  documentType?: string;
  detail?: string;
  message?: string;
  checksumSha256?: string;
  reviewerId?: string;
  reviewedAt?: string;
  verified?: boolean;
  sourceRecordIds?: string[];
}

export function queueIdentity(item: Pick<UpstreamQueueItem, 'id' | 'jobId'> | Pick<InvoiceQueueRecord, 'id' | 'jobId'>) {
  if (typeof item.jobId === 'string' && item.jobId.trim()) return item.jobId.trim();
  if (typeof item.id === 'string' && item.id.trim()) return item.id.trim();
  return '';
}

function mapUpstreamState(item: UpstreamQueueItem): InvoiceState {
  const raw = String(item.status ?? item.parsingStatus ?? item.state ?? '').toLowerCase();
  if (raw === 'queued' || raw === 'uploaded') return 'UPLOADED';
  if (raw === 'parsing') return 'PARSING';
  if (raw === 'review' || raw === 'needs_review') return 'NEEDS_REVIEW';
  if (raw === 'failed') return 'FAILED';
  if (raw === 'rejected') return 'REJECTED';
  if (raw === 'verified') return 'VERIFIED';
  if (raw === 'included_in_analysis') return 'INCLUDED_IN_ANALYSIS';
  if (raw === 'completed') {
    return item.verified === true && Boolean(item.reviewerId) && Boolean(item.reviewedAt)
      ? 'VERIFIED'
      : 'NEEDS_REVIEW';
  }
  return 'UPLOADED';
}

function normalizeSource(source?: string): InvoiceQueueRecord['source'] {
  return source === 'email' || source === 'erp' || source === 'vendor-api' ? source : 'upload';
}

export function normalizeQueueItem(item: UpstreamQueueItem, existing?: InvoiceQueueRecord): InvoiceQueueRecord {
  const identity = queueIdentity(item) || queueIdentity(existing ?? { id: '' });
  if (!identity) throw new Error('Invoice queue record requires a stable jobId or server id');

  return {
    id: existing?.id ?? identity,
    jobId: item.jobId ?? existing?.jobId,
    state: mapUpstreamState(item),
    fileName: item.fileName ?? existing?.fileName ?? 'Invoice document',
    uploadedAt: item.uploadedAt ?? existing?.uploadedAt ?? new Date(0).toISOString(),
    source: normalizeSource(item.source ?? existing?.source),
    location: item.location ?? existing?.location ?? 'Portfolio',
    vendor: item.vendor ?? existing?.vendor ?? 'Vendor pending parse',
    documentType: item.documentType ?? existing?.documentType ?? 'Invoice document',
    detail: item.detail ?? item.message ?? existing?.detail ?? 'Awaiting ingestion status update.',
    checksumSha256: item.checksumSha256 ?? existing?.checksumSha256,
    reviewerId: item.reviewerId ?? existing?.reviewerId,
    reviewedAt: item.reviewedAt ?? existing?.reviewedAt,
    sourceRecordIds: item.sourceRecordIds ?? existing?.sourceRecordIds ?? [],
  };
}

export function mergeQueueItems(priorityItems: InvoiceQueueRecord[], existingItems: InvoiceQueueRecord[]) {
  const merged = new Map<string, InvoiceQueueRecord>();

  for (const item of existingItems) merged.set(queueIdentity(item) || item.id, item);
  for (const incoming of priorityItems) {
    const key = queueIdentity(incoming) || incoming.id;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...incoming,
      checksumSha256: incoming.checksumSha256 ?? existing.checksumSha256,
      reviewerId: incoming.reviewerId ?? existing.reviewerId,
      reviewedAt: incoming.reviewedAt ?? existing.reviewedAt,
      sourceRecordIds: incoming.sourceRecordIds.length ? incoming.sourceRecordIds : existing.sourceRecordIds,
    } : incoming);
  }

  return [...merged.values()].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}
