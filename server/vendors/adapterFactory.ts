import type { VendorAdapter } from './adapter';
import { BlockedVendorAdapter } from './blockedAdapter';
import { loadVendorConfig } from './config';
import { AuthorizedHttpVendorAdapter, type VendorNormalizer } from './httpAdapter';
import type { VendorId } from '../../shared/contracts/vendors';

const normalizers = new Map<VendorId, VendorNormalizer>();

export function registerVendorNormalizer(vendorId: VendorId, normalizer: VendorNormalizer) {
  normalizers.set(vendorId, normalizer);
}

export function createVendorAdapter(vendorId: VendorId, version: string, env: NodeJS.ProcessEnv = process.env): VendorAdapter {
  const config = loadVendorConfig(vendorId, env);
  if (!config) return new BlockedVendorAdapter(vendorId, 'MISSING_AUTHORIZED_CONFIGURATION');

  const normalizer = normalizers.get(vendorId);
  if (!normalizer) return new BlockedVendorAdapter(vendorId, 'MISSING_OFFICIAL_VENDOR_NORMALIZER');

  return new AuthorizedHttpVendorAdapter(vendorId, version, config, normalizer);
}
