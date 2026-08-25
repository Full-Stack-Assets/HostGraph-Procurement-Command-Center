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

  private authHeaders() {
    return this.config.authKind === 'BEARER'
      ? { Authorization: `Bearer ${this.config.token}` }
      : { [this.config.authHeader]: this.config.token };
  }

  async verifyLiveRead(context: VendorReadContext): Promise<VendorReadObservation> {
    const requestedAt = new Date().toISOString();
    const correlationId = randomUUID();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-HostGraph-Correlation-Id': correlationId,
          'X-HostGraph-Account-Ref': this.config.accountId,
          ...this.authHeaders(),
        },
        signal: controller.signal,
      });

      const respondedAt = new Date().toISOString();
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

      const rawPayload: unknown = await response.json();
      const normalizedRecords = this.normalizer
        .normalize(rawPayload, context)
        .map((record) => VendorCommercialRecordSchema.parse(record));

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
    } catch (error) {
      const respondedAt = new Date().toISOString();
      const errorClass = error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_OR_SCHEMA_ERROR';
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
    } finally {
      clearTimeout(timer);
    }
  }
}
