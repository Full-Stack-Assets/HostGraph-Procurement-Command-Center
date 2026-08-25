import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthorizedHttpVendorAdapter } from '../server/vendors/httpAdapter';

const context = {
  vendorId: 'sysco-boston',
  vendorName: 'Sysco Boston',
  category: 'FOOD' as const,
  accountRef: 'acct-safe',
  commitSha: 'a'.repeat(40),
  buildSha256: 'b'.repeat(64),
};

const config = {
  vendorId: 'sysco-boston',
  baseUrl: 'https://api.vendor.example',
  readPath: '/account/prices',
  accountId: 'acct-safe',
  authKind: 'BEARER' as const,
  token: 'do-not-leak',
  authHeader: 'X-API-Key',
  authorizationBasis: 'VENDOR_API' as const,
};

const normalizer = {
  schemaVersion: '1',
  normalize: () => [{
    sourceRecordId: 'price-1',
    recordType: 'PRICE' as const,
    vendorId: 'sysco-boston',
    accountRef: 'acct-safe',
    sku: 'SKU-1',
    amount: 71.2,
    currency: 'USD',
    rawFieldPresence: ['id', 'sku', 'price'],
  }],
};

afterEach(() => vi.unstubAllGlobals());

describe('AuthorizedHttpVendorAdapter', () => {
  it('uses configured authenticated endpoint and returns normalized account data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'price-1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new AuthorizedHttpVendorAdapter('sysco-boston', '1.0.0', config, normalizer);
    const result = await adapter.verifyLiveRead(context);
    expect(result.result).toBe('PASS');
    expect(result.sourceRecordIds).toEqual(['price-1']);
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBe('Bearer do-not-leak');
  });

  it('fails on account or vendor identity mismatch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const badNormalizer = { ...normalizer, normalize: () => [{ ...normalizer.normalize()[0], accountRef: 'other-account' }] };
    const adapter = new AuthorizedHttpVendorAdapter('sysco-boston', '1.0.0', config, badNormalizer);
    expect((await adapter.verifyLiveRead(context)).errorClass).toBe('IDENTITY_MISMATCH');
  });

  it('never includes token material in returned errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));
    const adapter = new AuthorizedHttpVendorAdapter('sysco-boston', '1.0.0', config, normalizer);
    const result = await adapter.verifyLiveRead(context);
    expect(JSON.stringify(result)).not.toContain('do-not-leak');
  });
});
