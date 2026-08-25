import { z } from 'zod';

export const TrendDirectionSchema = z.enum(['up', 'down', 'flat']);
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;

export const KPIItemSchema = z.object({
  title: z.string(),
  value: z.string(),
  delta: z.string(),
  trend: TrendDirectionSchema,
  detail: z.string(),
});
export type KPIItem = z.infer<typeof KPIItemSchema>;

export const ActionItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  owner: z.string(),
  due: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const LeakIngredientSchema = z.object({
  ingredient: z.string(),
  location: z.string(),
  leakage: z.number().finite(),
  variancePct: z.number().finite(),
  issue: z.string(),
});
export type LeakIngredient = z.infer<typeof LeakIngredientSchema>;

export const MarginGapRowSchema = z.object({
  ingredientId: z.string().min(1),
  ingredient: z.string(),
  category: z.string(),
  location: z.string(),
  actualCost: z.number().finite(),
  theoreticalCost: z.number().finite(),
  gapPct: z.number().finite(),
  benchmarkPct: z.number().finite(),
  vendor: z.string(),
  issue: z.string(),
});
export type MarginGapRow = z.infer<typeof MarginGapRowSchema>;

export const MarginDrilldownSchema = z.object({
  ingredientId: z.string().min(1),
  ingredient: z.string(),
  story: z.string(),
  invoiceDelta: z.string(),
  yieldDelta: z.string(),
  benchmarkDelta: z.string(),
  events: z.array(z.object({ label: z.string(), value: z.number().finite() })),
});
export type MarginDrilldown = z.infer<typeof MarginDrilldownSchema>;

export const ReorderSuggestionSchema = z.object({
  sku: z.string().min(1),
  ingredient: z.string(),
  location: z.string(),
  onHand: z.string(),
  projectedExhaustion: z.string(),
  suggestedOrder: z.string(),
  vendorBestPrice: z.string(),
  alternateVendor: z.string(),
  risk: z.enum(['critical', 'watch', 'stable']),
});
export type ReorderSuggestion = z.infer<typeof ReorderSuggestionSchema>;

export const VendorScorecardRowSchema = z.object({
  vendor: z.string(),
  onTimePct: z.number().finite(),
  fillRatePct: z.number().finite(),
  priceDriftPct: z.number().finite(),
  invoiceAccuracyPct: z.number().finite(),
  note: z.string(),
});
export type VendorScorecardRow = z.infer<typeof VendorScorecardRowSchema>;

export const PriceTrendPointSchema = z.object({
  month: z.string(),
  mozzarella: z.number().finite(),
  chicken: z.number().finite(),
  avocados: z.number().finite(),
});
export type PriceTrendPoint = z.infer<typeof PriceTrendPointSchema>;
export const PriceTrendPointListSchema = z.array(PriceTrendPointSchema);

export const ShrinkageRowSchema = z.object({
  location: z.string(),
  ingredient: z.string(),
  expectedYield: z.number().finite(),
  actualYield: z.number().finite(),
  variancePct: z.number().finite(),
  lossValue: z.number().finite(),
});
export type ShrinkageRow = z.infer<typeof ShrinkageRowSchema>;

export const BenchmarkSliceSchema = z.object({
  name: z.string(),
  value: z.number().finite(),
});
export type BenchmarkSlice = z.infer<typeof BenchmarkSliceSchema>;

export const AlertItemSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(['critical', 'warning', 'info']),
  title: z.string(),
  detail: z.string(),
  timestamp: z.string(),
  location: z.string(),
});
export type AlertItem = z.infer<typeof AlertItemSchema>;

export const InventoryLevelSchema = z.object({
  ingredient: z.string(),
  location: z.string(),
  parLevel: z.number().finite(),
  onHand: z.number().finite(),
});
export type InventoryLevel = z.infer<typeof InventoryLevelSchema>;
export const InventoryLevelListSchema = z.array(InventoryLevelSchema);

export const DashboardSummarySchema = z.object({
  kpis: z.array(KPIItemSchema),
  leakingIngredients: z.array(LeakIngredientSchema),
  actions: z.array(ActionItemSchema),
  benchmarkMix: z.array(BenchmarkSliceSchema),
  marginBridge: z.array(z.object({ label: z.string(), value: z.number().finite() })),
  narrative: z.string(),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

export const MarginGapResponseSchema = z.object({
  filters: z.object({
    location: z.string(),
    dateFrom: z.string(),
    dateTo: z.string(),
    category: z.string(),
  }),
  rows: z.array(MarginGapRowSchema),
  benchmarkOverlay: z.array(BenchmarkSliceSchema),
});
export type MarginGapResponse = z.infer<typeof MarginGapResponseSchema>;

export const ReorderResponseSchema = z.object({
  suggestions: z.array(ReorderSuggestionSchema),
  inventoryLevels: InventoryLevelListSchema,
});
export type ReorderResponse = z.infer<typeof ReorderResponseSchema>;

export const VendorResponseSchema = z.object({
  scorecard: z.array(VendorScorecardRowSchema),
  priceTrends: PriceTrendPointListSchema,
  driftAlerts: z.array(AlertItemSchema),
});
export type VendorResponse = z.infer<typeof VendorResponseSchema>;

export const ShrinkageResponseSchema = z.object({
  summary: z.array(KPIItemSchema),
  rows: z.array(ShrinkageRowSchema),
});
export type ShrinkageResponse = z.infer<typeof ShrinkageResponseSchema>;

export const AlertsResponseSchema = z.object({ alerts: z.array(AlertItemSchema) });
export type AlertsResponse = z.infer<typeof AlertsResponseSchema>;

export const BenchmarksResponseSchema = z.object({ benchmarks: z.array(BenchmarkSliceSchema) });
export type BenchmarksResponse = z.infer<typeof BenchmarksResponseSchema>;

export const SavedFilterPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  filters: MarginGapResponseSchema.shape.filters,
  ingredientId: z.string().optional(),
  updatedAt: z.string(),
});
export type SavedFilterPreset = z.infer<typeof SavedFilterPresetSchema>;

export const IngestionQueueStatusSchema = z.enum(['queued', 'parsing', 'review', 'completed', 'failed']);

export const IngestionQueueItemSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  source: z.enum(['upload', 'email', 'erp']),
  uploadedAt: z.string(),
  status: IngestionQueueStatusSchema,
  location: z.string(),
  vendor: z.string(),
  documentType: z.string(),
  detail: z.string(),
  jobId: z.string().optional(),
});
export type IngestionQueueItem = z.infer<typeof IngestionQueueItemSchema>;

export const IngestionQueueResponseSchema = z.object({ items: z.array(IngestionQueueItemSchema) });
export type IngestionQueueResponse = z.infer<typeof IngestionQueueResponseSchema>;

export const InvoiceUploadResponseSchema = z.object({
  message: z.string().optional(),
  jobId: z.string().optional(),
  fileName: z.string().optional(),
  status: z.string().optional(),
  parsingStatus: z.string().optional(),
  state: z.string().optional(),
  vendor: z.string().optional(),
}).passthrough();
export type InvoiceUploadResponse = z.infer<typeof InvoiceUploadResponseSchema>;

export const InvoiceJobStatusResponseSchema = z.object({
  id: z.string().optional(),
  jobId: z.string().optional(),
  status: z.string().optional(),
  parsingStatus: z.string().optional(),
  state: z.string().optional(),
  fileName: z.string().optional(),
  uploadedAt: z.string().optional(),
  location: z.string().optional(),
  vendor: z.string().optional(),
  documentType: z.string().optional(),
  detail: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
}).passthrough();
export type InvoiceJobStatusResponse = z.infer<typeof InvoiceJobStatusResponseSchema>;
