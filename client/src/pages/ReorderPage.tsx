/**
 * Design reminder: treat reorder suggestions like an operator queue—dense, directional, and anchored by risk color rather than decorative elements.
 */
import { useCallback } from 'react';
import { api } from '@/services/api';
import { reorderData } from '@/data/mockData';
import { useHostGraphData } from '@/hooks/useHostGraphData';
import {
  LoadingPanel,
  PageStateBanner,
  SectionHeading,
  SeverityBadge,
  Surface,
} from '@/components/dashboard-primitives';

export default function ReorderPage() {
  const fetchReorders = useCallback(() => api.getReorderSuggestions(), []);
  const { data, loading, error, usingFallback } = useHostGraphData(fetchReorders, { fallbackData: reorderData });

  if (loading) return <LoadingPanel label="Calculating reorder queue…" />;

  return (
    <div className="space-y-6">
      <Surface className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-8">
            <SectionHeading
              eyebrow="Smart replenishment"
              title="Reorder suggestions with exhaustion timing"
              description="The reorder queue combines on-hand levels, projected depletion, and alternate vendor economics so buyers can choose timing and source without leaving the command center."
            />
          </div>
          <div className="border-t border-white/8 bg-white/[0.03] p-6 xl:border-l xl:border-t-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">What the operator sees</p>
            <p className="mt-3 text-sm leading-7 text-zinc-300">Back Bay mozzarella and South End chicken are both nearing exhaustion. The best demo move is to show how alternate vendor pricing protects the next order while preventing emergency buys.</p>
          </div>
        </div>
      </Surface>

      <PageStateBanner usingFallback={usingFallback} error={error} />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Surface>
          <SectionHeading
            eyebrow="Queue"
            title="Suggested orders"
            description="Critical rows should be addressed first to avoid rush buys and menu disruptions."
          />
          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/8">
                <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.24em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ingredient</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">On hand</th>
                    <th className="px-4 py-3 font-medium">Exhaustion</th>
                    <th className="px-4 py-3 font-medium">Suggested order</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 bg-black/10">
                  {data.suggestions.map((row) => (
                    <tr key={row.sku} className="transition hover:bg-white/[0.04]">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-white">{row.ingredient}</p>
                          <p className="mt-1 font-mono text-xs text-zinc-500">{row.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-300">{row.location}</td>
                      <td className="px-4 py-4 font-mono text-sm text-zinc-200">{row.onHand}</td>
                      <td className="px-4 py-4 text-sm text-zinc-300">{row.projectedExhaustion}</td>
                      <td className="px-4 py-4 font-mono text-sm text-emerald-300">{row.suggestedOrder}</td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white">{row.alternateVendor}</p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">{row.vendorBestPrice}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Surface>

        <Surface>
          <SectionHeading
            eyebrow="Inventory posture"
            title="Par versus on-hand"
            description="A compact readiness view for the most watched ingredients across the fleet."
          />
          <div className="mt-6 space-y-4">
            {data.inventoryLevels.map((item) => {
              const ratio = Math.max(0, Math.min(100, (item.onHand / item.parLevel) * 100));
              return (
                <div key={`${item.location}-${item.ingredient}`} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{item.ingredient}</p>
                      <p className="mt-1 text-sm text-zinc-500">{item.location}</p>
                    </div>
                    <SeverityBadge severity={ratio < 45 ? 'critical' : ratio < 70 ? 'watch' : 'stable'} />
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${ratio}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
                    <span>On hand {item.onHand}</span>
                    <span>Par {item.parLevel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Surface>
      </section>
    </div>
  );
}
