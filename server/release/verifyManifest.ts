import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { SignedReleaseManifestSchema, type SignedReleaseManifest } from '../../shared/contracts/releaseManifest';
import { canonicalize } from '../vendors/verifyVendor';

function sha256(value: unknown) {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

function secureEqualHex(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyReleaseManifest(manifestInput: SignedReleaseManifest, hmacKey?: string) {
  const manifest = SignedReleaseManifestSchema.parse(manifestInput);
  const expectedPayloadSha = sha256(manifest.payload);
  if (!secureEqualHex(expectedPayloadSha, manifest.payloadSha256)) {
    return { ok: false, error: 'PAYLOAD_DIGEST_MISMATCH' } as const;
  }

  const protectedState = ['REGIONAL_DATA_READY', 'PILOT_READY', 'PAID_PILOT_READY', 'PRODUCTION_READY'].includes(manifest.payload.releaseState);
  if (protectedState && (!hmacKey || !manifest.hmacSha256)) {
    return { ok: false, error: 'MISSING_MANIFEST_HMAC' } as const;
  }

  if (manifest.hmacSha256) {
    if (!hmacKey) return { ok: false, error: 'MISSING_HMAC_KEY' } as const;
    const expected = createHmac('sha256', hmacKey).update(canonicalize(manifest.payload)).digest('hex');
    if (!secureEqualHex(expected, manifest.hmacSha256)) {
      return { ok: false, error: 'HMAC_MISMATCH' } as const;
    }
  }

  if (protectedState && manifest.payload.regionalGateResult !== 'PASS') {
    return { ok: false, error: 'REGIONAL_GATE_NOT_PASS' } as const;
  }
  if (['PILOT_READY', 'PAID_PILOT_READY', 'PRODUCTION_READY'].includes(manifest.payload.releaseState) && manifest.payload.reconciliationResult !== 'PASS') {
    return { ok: false, error: 'RECONCILIATION_NOT_PASS' } as const;
  }

  return { ok: true } as const;
}
