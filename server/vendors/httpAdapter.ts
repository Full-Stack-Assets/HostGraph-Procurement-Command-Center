import { randomUUID } from 'node:crypto';
import { VendorCommercialRecordSchema, type VendorCommercialRecord } from '../../shared/contracts/vendorCommercialRecord';
import type { VendorAdapter, VendorReadContext, VendorReadObservation } from './adapter';
import type { VendorAdapterConfig } from './config';

export interface VendorNormalizer {
  schemaVersion: string;
  normalize(raw: unknown, context: VendorReadContext): VendorCommercialRecord[];
  unsupportedFields?: string[];
}

export class AuthorizedHttpVendorAdapter implements VendorAdapter {
  constructor(
    public readonly vendorId: string,
    public readonly version: string,
    private readonly config: VendorAdapterConfig,
    private readonly normalizer: VendorNormalizer,
    private readonly timeoutMs = 10_000,
  ) {}

  private buildUrl() {
    const base = new URL(this.config.baseUrl);
    if (base.protocol !== 'https:' && base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') {
      throw new Error('Vendor API base URL must use HTTPS');
    }
    return new URL(this.config.readPath, base).toString();
  }

  private buildHeaders(correlationId: string) {
    const headers = new Headers();
    headers.set('Accept', 'application/json');
    headers.set('X-HostGraph-Correlation-Id', correlationId);
    headers.set('X-HostGraph-Account-Ref', this.config.accountId);

    if (this.config.authKind === 'BEARER') {
      headers.set('Authorization', `Bearer ${this.config.token}`);
    } else {
      headers.set(this.config.authHeader, this.config.token);
    }

    return headers;
  }

  private async fetchOnce(correlationId: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(this.buildUrl(), {
        method: 'GET',
        headers: this.buildHeaders(correlationId),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async verifyLiveRead(context: VendorReadContext): Promise<VendorReadObservation> {
    const requestedAt = new Date().toISOString();
    const correlationId = randomUUID();
    let response: Response | null = null;
    let lastNetworkError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await this.fetchOnce(correlationId);
        // Only idempotent GET failures that may be transient are retried.
        if (response.status < 500 || attempt === 1) break;
      } catch (error) {
        lastNetworkError = error;
        if (attempt === 1) break;
      }
    }

    const respondedAt = new Date().toISOString();

    if (!response) {
      const errorClass = lastNetworkError instanceof Error && lastNetworkError.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      return {
        result: 'FAIL',
        authorizationBasis: this.config.authorizationBasis,
        operationId: this.config.readPath,
        requestedAt,
        respondedAt,
        sourceRecordIds: [],
        rawPayload: null,
        normalizedRecords: [],
        schemaVersion: this.normalizer.schemaVersion,
        freshAt: respondedAt,
        errorClass,
        unsupportedFields: this.normalizer.unsupportedFields ?? [],
      };
    }

    if (!response.ok) {
      return {
        result: 'FAIL',
        authorizationBasis: this.config.authorizationBasis,
        operationId: this.config.readPath,
        requestedAt,
        respondedAt,
        sourceRecordIds: [],
        rawPayload: null,
        normalizedRecords: [],
        schemaVersion: this.normalizer.schemaVersion,
        freshAt: respondedAt,
        errorClass: `HTTP_${response.status}`,
        unsupportedFields: this.normalizer.unsupportedFields ?? [],
      };
    }

    let rawPayload: unknown;
    let normalizedRecords: VendorCommercialRecord[];
    try {
      rawPayload = await response.json();
      normalizedRecords = this.normalizer
        .normalize(rawPayload, context)
        .map((record) => VendorCommercialRecordSchema.parse(record));
    } catch {
      return {
        result: 'FAIL',
        authorizationBasis: this.config.authorizationBasis,
        operationId: this.config.readPath,
        requestedAt,
        respondedAt,
        sourceRecordIds: [],
        rawPayload: null,
        normalizedRecords: [],
        schemaVersion: this.normalizer.schemaVersion,
        freshAt: respondedAt,
        errorClass: 'SCHEMA_OR_NORMALIZATION_ERROR',
        unsupportedFields: this.normalizer.unsupportedFields ?? [],
      };
    }

    if (normalizedRecords.length === 0) {
      return {
        result: 'FAIL',
        authorizationBasis: this.config.authorizationBasis,
        operationId: this.config.readPath,
        requestedAt,
        respondedAt,
        sourceRecordIds: [],
        rawPayload: null,
        normalizedRecords: [],
        schemaVersion: this.normalizer.schemaVersion,
        freshAt: respondedAt,
        errorClass: 'NO_ACCOUNT_SCOPED_COMMERCIAL_RECORDS',
        unsupportedFields: this.normalizer.unsupportedFields ?? [],
      };
    }

    for (const record of normalizedRecords) {
      if (record.vendorId !== context.vendorId || record.accountRef !== context.accountRef) {
        return {
          result: 'FAIL',
          authorizationBasis: this.config.authorizationBasis,
          operationId: this.config.readPath,
          requestedAt,
          respondedAt,
          sourceRecordIds: [],
          rawPayload: null,
          normalizedRecords: [],
          schemaVersion: this.normalizer.schemaVersion,
          freshAt: respondedAt,
          errorClass: 'IDENTITY_MISMATCH',
          unsupportedFields: this.normalizer.unsupportedFields ?? [],
        };
      }
    }

    return {
      result: 'PASS',
      authorizationBasis: this.config.authorizationBasis,
      operationId: this.config.readPath,
      requestedAt,
      respondedAt,
      sourceRecordIds: normalizedRecords.map((record) => record.sourceRecordId),
      rawPayload,
      normalizedRecords,
      schemaVersion: this.normalizer.schemaVersion,
      freshAt: respondedAt,
      errorClass: null,
      unsupportedFields: this.normalizer.unsupportedFields ?? [],
    };
  }
}
