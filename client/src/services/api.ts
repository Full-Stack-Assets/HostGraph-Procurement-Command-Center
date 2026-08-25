import { z } from 'zod';
import {
  AlertsResponseSchema,
  BenchmarksResponseSchema,
  DashboardSummarySchema,
  IngestionQueueItemSchema,
  IngestionQueueResponseSchema,
  InventoryLevelListSchema,
  InvoiceJobStatusResponseSchema,
  InvoiceUploadResponseSchema,
  MarginDrilldownSchema,
  MarginGapResponseSchema,
  PriceTrendPointListSchema,
  ReorderResponseSchema,
  ShrinkageResponseSchema,
  VendorResponseSchema,
  type IngestionQueueItem,
  type IngestionQueueResponse,
  type InvoiceJobStatusResponse,
  type InvoiceUploadResponse,
} from '@shared/contracts/analytics';

export interface MarginGapParams {
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
}

export type ApiErrorKind = 'HTTP' | 'NETWORK' | 'TIMEOUT' | 'SCHEMA' | 'ABORTED';

export class HostGraphApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'HostGraphApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;

const buildQuery = (params?: object) => {
  const search = new URLSearchParams();
  Object.entries((params ?? {}) as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

function correlationId() {
  return globalThis.crypto?.randomUUID?.() ?? `hg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldRetry(error: unknown) {
  if (!(error instanceof HostGraphApiError)) return false;
  if (error.kind === 'NETWORK' || error.kind === 'TIMEOUT') return true;
  return error.kind === 'HTTP' && (error.status ?? 0) >= 500;
}

async function requestValidated<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit,
  options?: { timeoutMs?: number; retrySafeRead?: boolean },
): Promise<z.infer<T>> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const attempts = method === 'GET' && options?.retrySafeRead !== false ? 2 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const requestCorrelationId = correlationId();
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-HostGraph-Correlation-Id', requestCorrelationId);
    if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(path, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new HostGraphApiError(
          'HTTP',
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          requestCorrelationId,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new HostGraphApiError(
          'SCHEMA',
          'API returned a non-JSON payload where JSON was required',
          response.status,
          requestCorrelationId,
        );
      }

      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        throw new HostGraphApiError(
          'SCHEMA',
          `API response failed runtime validation: ${parsed.error.issues[0]?.message ?? 'invalid payload'}`,
          response.status,
          requestCorrelationId,
        );
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof HostGraphApiError) {
        lastError = error;
      } else if (controller.signal.aborted) {
        const timeoutError = new HostGraphApiError(
          controller.signal.reason === 'timeout' ? 'TIMEOUT' : 'ABORTED',
          controller.signal.reason === 'timeout' ? `API request timed out after ${timeoutMs}ms` : 'API request aborted',
          undefined,
          requestCorrelationId,
        );
        lastError = timeoutError;
      } else {
        lastError = new HostGraphApiError(
          'NETWORK',
          error instanceof Error ? error.message : 'Network request failed',
          undefined,
          requestCorrelationId,
        );
      }

      if (attempt + 1 >= attempts || !shouldRetry(lastError)) {
        throw lastError;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new HostGraphApiError('NETWORK', 'API request failed');
}

async function requestFirstAvailable<T extends z.ZodTypeAny>(paths: string[], schema: T): Promise<z.infer<T>> {
  let lastError: unknown;

  for (const path of paths) {
    try {
      return await requestValidated(path, schema);
    } catch (error) {
      lastError = error;
      if (error instanceof HostGraphApiError && error.kind !== 'HTTP') break;
    }
  }

  throw lastError instanceof Error ? lastError : new HostGraphApiError('HTTP', 'No matching API endpoint responded');
}

const invoiceQueueWireSchema = z.union([IngestionQueueResponseSchema, z.array(IngestionQueueItemSchema)]);

export const api = {
  getDashboardSummary: () => requestValidated('/api/v1/dashboard/summary', DashboardSummarySchema),
  getMarginGap: (params?: MarginGapParams) =>
    requestValidated(`/api/v1/margin-gap${buildQuery(params)}`, MarginGapResponseSchema),
  getMarginGapDrilldown: (ingredientId: string) =>
    requestValidated(`/api/v1/margin-gap/${encodeURIComponent(ingredientId)}/drilldown`, MarginDrilldownSchema),
  getInventoryLevels: () => requestValidated('/api/v1/inventory/levels', InventoryLevelListSchema),
  getReorderSuggestions: () => requestValidated('/api/v1/inventory/reorder-suggestions', ReorderResponseSchema),
  getShrinkageReport: () => requestValidated('/api/v1/shrinkage-report', ShrinkageResponseSchema),
  getBenchmarks: () => requestValidated('/api/v1/benchmarks', BenchmarksResponseSchema),
  getVendorsScorecard: () => requestValidated('/api/v1/vendors/scorecard', VendorResponseSchema),
  getPriceTrends: () => requestValidated('/api/v1/price-trends', PriceTrendPointListSchema),
  getAlerts: () => requestValidated('/api/v1/alerts', AlertsResponseSchema),
  getInvoiceQueue: async (): Promise<IngestionQueueResponse> => {
    const response = await requestFirstAvailable(
      ['/api/v1/invoices/queue', '/api/v1/invoices/history', '/api/v1/invoices/status', '/api/v1/invoices/uploads'],
      invoiceQueueWireSchema,
    );
    return Array.isArray(response) ? { items: response as IngestionQueueItem[] } : response;
  },
  getInvoiceJobStatus: (jobId: string): Promise<InvoiceJobStatusResponse> =>
    requestFirstAvailable(
      [
        `/api/v1/invoices/jobs/${encodeURIComponent(jobId)}`,
        `/api/v1/invoices/status/${encodeURIComponent(jobId)}`,
        `/api/v1/invoices/${encodeURIComponent(jobId)}`,
      ],
      InvoiceJobStatusResponseSchema,
    ),
  uploadInvoice: async (file: File): Promise<InvoiceUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return requestValidated(
      '/api/v1/invoices/upload',
      InvoiceUploadResponseSchema,
      { method: 'POST', body: formData },
      { retrySafeRead: false },
    );
  },
};
