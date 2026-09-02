import { useCallback } from 'react';
import { DataStatusRail } from '@/components/DataStatusRail';
import {
  HeroPanel,
  LoadingPanel,
  PageStateBanner,
  SectionHeading,
  Surface,
} from '@/components/dashboard-primitives';
import { inventoryWorkspaceFixture } from '@/data/procurementWorkspaceFixtures';
import { useHostGraphData } from '@/hooks/useHostGraphData';
import { api } from '@/services/api';

function displayNumber(value?: number) {
  return value === undefined ? 'Unavailable' : value.toLocaleString('en-US');
}

function displayTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export default function InventoryPage() {
  const fetchInventory = useCallback(() => api.getInventoryWorkspace(), []);
  const response = useHostGraphData(fetchInventory, { fallbackData: inventoryWorkspaceFixture });

  if (response.loading) return <LoadingPanel label="Loading inventory evidence workspace…" />;

  const synthetic = response.data.source.kind === 'SYNTHETIC_FIXTURE';

  return (
    <div className="space-y-6">
      <HeroPanel
        eyebrow="Inventory observations"
        title="Inventory workspace"
        description="Inspect source-backed stock observations without inventing pack conversions, reorder math, or vendor data that the source did not provide."
        image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 720'%3E%3Crect width='1200' height='720' fill='%23060817'/%3E%3Ccircle cx='190' cy='150' r='220' fill='%2306b6d4' fill-opacity='.10'/%3E%3Cg fill='%23fff' fill-opacity='.045' stroke='%237c3aed' stroke-opacity='.22'%3E%3Crect x='190' y='210' width='230' height='160'/%3E%3Crect x='485' y='210' width='230' height='160'/%3E%3Crect x='780' y='210' width='230' height='160'/%3E%3Crect x='335' y='430' width='230' height='160'/%3E%3Crect x='630' y='430' width='230' height='160'/%3E%3C/g%3E%3C/svg%3E"
      >
        <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-zinc-300">
          <p className="font-medium text-white">{synthetic ? 'Synthetic donor-derived fixture' : 'Validated live inventory source'}</p>
          <p className="mt-1 text-zinc-400">No pack or unit conversion is inferred. Missing quantity, unit, par, or reorder fields remain Unavailable.</p>
        </div>
      </HeroPanel>

      <PageStateBanner usingFallback={response.usingFallback} error={response.error} />

      <DataStatusRail
        mode={response.mode}
        fetchedAt={response.fetchedAt}
        sourceCoverage={null}
        invoicesProcessed={null}
        invoicesAwaitingReview={null}
        dataExceptions={null}
      />

      <Surface>
        <SectionHeading
          eyebrow="Observed stock"
          title="Current inventory records"
          description="Every displayed field comes from the active source payload. Unknown fields are deliberately left unavailable instead of being reconstructed from neighboring UI state."
          aside={<span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{response.data.source.recordCount} observations</span>}
        />

        {response.data.items.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-black/15 p-6 text-sm text-zinc-400">
            No inventory observations are available for the active source.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/8 text-left">
                <thead className="bg-white/[0.03]">
                  <tr className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Par</th>
                    <th className="px-4 py-3 font-medium">Reorder point</th>
                    <th className="px-4 py-3 font-medium">Observed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 bg-black/10">
                  {response.data.items.map((item) => (
                    <tr key={item.sourceRecordId}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-white">{item.itemName}</p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">{item.sku ?? item.sourceRecordId}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-300">{item.locationName}</td>
                      <td className="px-4 py-4 text-sm text-zinc-300">{item.vendorName ?? 'Unavailable'}</td>
                      <td className="px-4 py-4 font-mono text-sm text-white">{displayNumber(item.quantity)}</td>
                      <td className="px-4 py-4 font-mono text-sm text-zinc-300">{item.unit ?? 'Unavailable'}</td>
                      <td className="px-4 py-4 font-mono text-sm text-zinc-300">{displayNumber(item.parLevel)}</td>
                      <td className="px-4 py-4 font-mono text-sm text-zinc-300">{displayNumber(item.reorderPoint)}</td>
                      <td className="px-4 py-4 font-mono text-xs text-zinc-500">{displayTimestamp(item.observedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Surface>

      <Surface className="bg-white/[0.025]">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Source provenance</p>
        <p className="mt-2 text-sm text-zinc-300">{response.data.source.sourceSystem}</p>
        <p className="mt-2 text-xs text-zinc-500">Fixture/source timestamp: {response.data.source.freshAt}</p>
        <p className="mt-2 break-all font-mono text-xs text-zinc-500">{response.data.source.provenanceRef}</p>
      </Surface>
    </div>
  );
}
