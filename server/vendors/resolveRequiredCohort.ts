import { REGIONAL_VENDOR_COHORT } from './registry';
import {
  RequiredVendorCohortSchema,
  VendorSpendRowSchema,
  type RequiredVendor,
  type RequiredVendorCohort,
  type VendorSpendRow,
} from '../../shared/contracts/vendorSpend';

function baseline(): RequiredVendorCohort {
  return RequiredVendorCohortSchema.parse({
    mode: 'BASELINE',
    vendors: REGIONAL_VENDOR_COHORT.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      category: vendor.category,
      sourceRecordIds: [],
    })),
  });
}

function aggregate(rows: VendorSpendRow[]): VendorSpendRow[] {
  const parsed = rows.map((row) => VendorSpendRowSchema.parse(row));
  const groups = new Map<string, VendorSpendRow>();

  for (const row of parsed) {
    const existing = groups.get(row.vendorId);
    if (!existing) {
      groups.set(row.vendorId, { ...row, sourceRecordIds: [...row.sourceRecordIds] });
      continue;
    }

    if (
      existing.currency !== row.currency ||
      existing.periodStart !== row.periodStart ||
      existing.periodEnd !== row.periodEnd ||
      existing.category !== row.category
    ) {
      throw new Error(`Ambiguous trailing-spend evidence for vendor ${row.vendorId}`);
    }

    groups.set(row.vendorId, {
      ...existing,
      trailingSpend: existing.trailingSpend + row.trailingSpend,
      sourceRecordIds: Array.from(new Set([...existing.sourceRecordIds, ...row.sourceRecordIds])).sort(),
    });
  }

  return Array.from(groups.values());
}

function select(rows: VendorSpendRow[], category: 'FOOD' | 'BEVERAGE'): RequiredVendor[] {
  return rows
    .filter((row) => row.category === category)
    .sort((a, b) => b.trailingSpend - a.trailingSpend || a.vendorId.localeCompare(b.vendorId))
    .slice(0, 5)
    .map((row) => ({
      id: row.vendorId,
      name: row.vendorName,
      category: row.category,
      trailingSpend: row.trailingSpend,
      sourceRecordIds: row.sourceRecordIds,
    }));
}

export function resolveRequiredVendorCohort(spendRows?: VendorSpendRow[]): RequiredVendorCohort {
  if (!spendRows?.length) return baseline();

  const rows = aggregate(spendRows);
  const food = select(rows, 'FOOD');
  const beverage = select(rows, 'BEVERAGE');

  if (food.length < 5 || beverage.length < 5) return baseline();

  const vendors = [...food, ...beverage];
  if (new Set(vendors.map((vendor) => vendor.id)).size !== 10) {
    throw new Error('Customer trailing-spend cohort must contain ten unique vendors');
  }

  return RequiredVendorCohortSchema.parse({ mode: 'CUSTOMER_TRAILING_SPEND', vendors });
}
