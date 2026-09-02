import { describe, expect, it } from 'vitest';
import {
  InvoiceWorkspaceResponseSchema,
  InventoryWorkspaceResponseSchema,
  SupplierOpportunityResponseSchema,
} from '../shared/contracts/procurementWorkspaces';
import {
  invoiceWorkspaceFixture,
  inventoryWorkspaceFixture,
  supplierOpportunityFixture,
} from '../client/src/data/procurementWorkspaceFixtures';

describe('reconciled procurement workspace contracts', () => {
  it('parses the invoice fixture only as an explicitly synthetic source', () => {
    const parsed = InvoiceWorkspaceResponseSchema.parse(invoiceWorkspaceFixture);

    expect(parsed.source.kind).toBe('SYNTHETIC_FIXTURE');
    expect(parsed.source.provenanceRef).toContain(
      '8c94203b0ffad9e88628a7949a79f3d2e873da8a29ffb93398adf773842a764d',
    );
    expect(parsed.invoices).toHaveLength(3);
  });

  it('keeps inventory unit data explicit rather than inferring conversions', () => {
    const parsed = InventoryWorkspaceResponseSchema.parse(inventoryWorkspaceFixture);

    expect(parsed.source.kind).toBe('SYNTHETIC_FIXTURE');
    expect(parsed.items).toHaveLength(4);
    expect(parsed.items.every((item) => item.unit === undefined || item.unit.trim().length > 0)).toBe(true);
  });

  it('allows only DETECTED supplier opportunities in reconciliation release 1', () => {
    const parsed = SupplierOpportunityResponseSchema.parse(supplierOpportunityFixture);

    expect(parsed.opportunities).toHaveLength(4);
    expect(parsed.opportunities.every((opportunity) => opportunity.evidenceState === 'DETECTED')).toBe(true);
  });

  it('rejects an attempt to upgrade a donor opportunity to REALIZED', () => {
    const candidate = {
      ...supplierOpportunityFixture,
      opportunities: [
        {
          ...supplierOpportunityFixture.opportunities[0],
          evidenceState: 'REALIZED',
        },
        ...supplierOpportunityFixture.opportunities.slice(1),
      ],
    };

    expect(() => SupplierOpportunityResponseSchema.parse(candidate)).toThrow();
  });

  it('rejects secret-like keys in workspace source metadata', () => {
    const candidate = {
      ...invoiceWorkspaceFixture,
      source: {
        ...invoiceWorkspaceFixture.source,
        token: 'must-never-be-accepted',
      },
    };

    expect(() => InvoiceWorkspaceResponseSchema.parse(candidate)).toThrow();
  });
});
