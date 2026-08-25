import type { VendorAuthorizationBasis, VendorId } from '../../shared/contracts/vendors';

export type VendorAuthKind = 'BEARER' | 'HEADER_TOKEN';

export interface VendorAdapterConfig {
  vendorId: VendorId;
  baseUrl: string;
  readPath: string;
  accountId: string;
  authKind: VendorAuthKind;
  token: string;
  authHeader: string;
  authorizationBasis: VendorAuthorizationBasis;
}

export function vendorEnvPrefix(vendorId: string) {
  return vendorId.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

export function loadVendorConfig(vendorId: VendorId, env: NodeJS.ProcessEnv = process.env): VendorAdapterConfig | null {
  const prefix = `HOSTGRAPH_VENDOR_${vendorEnvPrefix(vendorId)}`;
  const baseUrl = env[`${prefix}_BASE_URL`];
  const readPath = env[`${prefix}_READ_PATH`];
  const accountId = env[`${prefix}_ACCOUNT_ID`];
  const authKind = env[`${prefix}_AUTH_KIND`];
  const token = env[`${prefix}_TOKEN`];
  const authHeader = env[`${prefix}_AUTH_HEADER`] || 'X-API-Key';
  const authorizationBasis = env[`${prefix}_AUTHORIZATION_BASIS`];

  if (!baseUrl || !readPath || !accountId || !authKind || !token || !authorizationBasis) return null;
  if (authKind !== 'BEARER' && authKind !== 'HEADER_TOKEN') return null;
  if (authorizationBasis !== 'VENDOR_API' && authorizationBasis !== 'VENDOR_AUTHORIZED_INTEGRATION') return null;

  return {
    vendorId,
    baseUrl,
    readPath,
    accountId,
    authKind,
    token,
    authHeader,
    authorizationBasis,
  };
}

export function safeVendorConfigSummary(config: VendorAdapterConfig | null) {
  if (!config) return { configured: false } as const;
  return {
    configured: true,
    vendorId: config.vendorId,
    baseUrl: config.baseUrl,
    readPath: config.readPath,
    accountId: config.accountId,
    authKind: config.authKind,
    authHeader: config.authKind === 'HEADER_TOKEN' ? config.authHeader : undefined,
    authorizationBasis: config.authorizationBasis,
  } as const;
}
