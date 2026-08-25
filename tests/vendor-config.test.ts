import { describe, expect, it } from 'vitest';
import { loadVendorConfig, safeVendorConfigSummary } from '../server/vendors/config';
import { BlockedVendorAdapter } from '../server/vendors/blockedAdapter';

const baseContext = {
  vendorId: 'sysco-boston',
  vendorName: 'Sysco Boston',
  category: 'FOOD' as const,
  accountRef: 'acct-safe-ref',
  commitSha: 'a'.repeat(40),
  buildSha256: 'b'.repeat(64),
};

describe('vendor adapter configuration', () => {
  it('returns null when authorized configuration is incomplete', () => {
    expect(loadVendorConfig('sysco-boston', {})).toBeNull();
  });

  it('loads only supported auth and authorization modes', () => {
    const env = {
      HOSTGRAPH_VENDOR_SYSCO_BOSTON_BASE_URL: 'https://api.vendor.example',
      HOSTGRAPH_VENDOR_SYSCO_BOSTON_READ_PATH: '/account/prices',
      HOSTGRAPH_VENDOR_SYSCO_BOSTON_ACCOUNT_ID: 'account-123',
      HOSTGRAPH_VENDOR_SYSCO_BOSTON_AUTH_KIND: 'BEARER',
      HOSTGRAPH_VENDOR_SYSCO_BOSTON_TOKEN: 'super-secret',
      HOSTGRAPH_VENDOR_SYSCO_BOSTON_AUTHORIZATION_BASIS: 'VENDOR_API',
    };
    const config = loadVendorConfig('sysco-boston', env);
    expect(config?.authKind).toBe('BEARER');
    expect(config?.authorizationBasis).toBe('VENDOR_API');
    expect(JSON.stringify(safeVendorConfigSummary(config))).not.toContain('super-secret');
  });

  it('produces BLOCKED without a network call when config is unavailable', async () => {
    const adapter = new BlockedVendorAdapter('sysco-boston');
    const observation = await adapter.verifyLiveRead(baseContext);
    expect(observation.result).toBe('BLOCKED');
    expect(observation.errorClass).toBe('MISSING_AUTHORIZED_CONFIGURATION');
    expect(observation.rawPayload).toBeNull();
  });
});
