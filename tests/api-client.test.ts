import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, HostGraphApiError } from '@/services/api';
import { dashboardSummary } from '@/data/mockData';
import {
  invoiceWorkspaceFixture,
  inventoryWorkspaceFixture,
  supplierOpportunityFixture,
} from '@/data/procurementWorkspaceFixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HostGraph API client', () => {
  it('rejects a schema-invalid 200 response instead of trusting TypeScript', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...dashboardSummary, kpis: 'wrong-shape' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(api.getDashboardSummary()).rejects.toMatchObject({ kind: 'SCHEMA' });
  });

  it('URL-encodes dynamic margin drilldown identifiers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ingredientId: 'a/b c',
          ingredient: 'Example',
          story: 'Test',
          invoiceDelta: '$0',
          yieldDelta: '0',
          benchmarkDelta: '0',
          events: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await api.getMarginGapDrilldown('a/b c');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/margin-gap/a%2Fb%20c/drilldown',
      expect.any(Object),
    );
  });

  it('retries one safe GET after a transient 500 and then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('temporary', { status: 500, statusText: 'Server Error' }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(dashboardSummary), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.getDashboardSummary()).resolves.toEqual(dashboardSummary);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('classifies structured API errors', () => {
    const error = new HostGraphApiError('TIMEOUT', 'Timed out', undefined, 'corr-1');
    expect(error.kind).toBe('TIMEOUT');
    expect(error.correlationId).toBe('corr-1');
  });

  it.each([
    ['invoice workspace', 'getInvoicesWorkspace', '/api/v1/invoices', invoiceWorkspaceFixture],
    ['inventory workspace', 'getInventoryWorkspace', '/api/v1/inventory', inventoryWorkspaceFixture],
    ['supplier opportunities', 'getSupplierOpportunities', '/api/v1/supplier-opportunities', supplierOpportunityFixture],
  ] as const)('reads the %s through its canonical validated endpoint', async (_label, method, path, payload) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api[method]()).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(path, expect.any(Object));
  });

  it('rejects malformed supplier-opportunity responses as SCHEMA errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...supplierOpportunityFixture,
            opportunities: [{ ...supplierOpportunityFixture.opportunities[0], evidenceState: 'REALIZED' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(api.getSupplierOpportunities()).rejects.toBeInstanceOf(HostGraphApiError);
    await expect(api.getSupplierOpportunities()).rejects.toMatchObject({ kind: 'SCHEMA' });
  });
});
