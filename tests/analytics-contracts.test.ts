import { describe, expect, it } from 'vitest';
import {
  AlertsResponseSchema,
  BenchmarksResponseSchema,
  DashboardSummarySchema,
  IngestionQueueResponseSchema,
  InventoryLevelListSchema,
  MarginDrilldownSchema,
  MarginGapResponseSchema,
  PriceTrendPointListSchema,
  ReorderResponseSchema,
  ShrinkageResponseSchema,
  VendorResponseSchema,
} from '@shared/contracts/analytics';
import {
  alertsData,
  benchmarksData,
  dashboardSummary,
  ingestionQueueData,
  inventoryLevels,
  marginDrilldowns,
  marginGapData,
  reorderData,
  shrinkageData,
  vendorData,
} from '@/data/mockData';

describe('HostGraph analytics runtime contracts', () => {
  it('accepts every repository demo fixture through the production schemas', () => {
    expect(DashboardSummarySchema.parse(dashboardSummary).kpis.length).toBeGreaterThan(0);
    expect(MarginGapResponseSchema.parse(marginGapData).rows.length).toBeGreaterThan(0);
    expect(MarginDrilldownSchema.parse(marginDrilldowns['mozz-001']).ingredientId).toBe('mozz-001');
    expect(InventoryLevelListSchema.parse(inventoryLevels).length).toBeGreaterThan(0);
    expect(ReorderResponseSchema.parse(reorderData).suggestions.length).toBeGreaterThan(0);
    expect(ShrinkageResponseSchema.parse(shrinkageData).rows.length).toBeGreaterThan(0);
    expect(BenchmarksResponseSchema.parse(benchmarksData).benchmarks.length).toBeGreaterThan(0);
    expect(VendorResponseSchema.parse(vendorData).scorecard.length).toBeGreaterThan(0);
    expect(PriceTrendPointListSchema.parse(vendorData.priceTrends).length).toBeGreaterThan(0);
    expect(AlertsResponseSchema.parse(alertsData).alerts.length).toBeGreaterThan(0);
    expect(IngestionQueueResponseSchema.parse(ingestionQueueData).items.length).toBeGreaterThan(0);
  });

  it('rejects a string where a money field must be numeric', () => {
    const malformed = {
      ...marginGapData,
      rows: [{ ...marginGapData.rows[0], actualCost: '3.92' }],
    };
    expect(() => MarginGapResponseSchema.parse(malformed)).toThrow();
  });

  it('rejects unknown ingestion lifecycle states', () => {
    const malformed = {
      items: [{ ...ingestionQueueData.items[0], status: 'magically-cleared' }],
    };
    expect(() => IngestionQueueResponseSchema.parse(malformed)).toThrow();
  });
});
