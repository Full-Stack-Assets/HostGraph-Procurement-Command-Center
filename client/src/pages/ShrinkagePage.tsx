/**
 * Design reminder: shrinkage view should feel diagnostic and operational, using yield deltas and loss values as the primary hierarchy.
 */
import { BarChart } from '@tremor/react';
import { useCallback } from 'react';
import { api } from '@/services/api';
import { shrinkageData } from '@/data/mockData';
import { useHostGraphData } from '@/hooks/useHostGraphData';
import {
  formatCurrencyCompact,
  HeroPanel,
  LoadingPanel,
  MetricCard,
  PageStateBanner,
  SectionHeading,
  Surface,
} from '@/components/dashboard-primitives';

export default function ShrinkagePage() {
  const fetchShrinkage = useCallback(() => api.getShrinkageReport(), []);
  const { data, loading, error, usingFallback } = useHostGraphData(fetchShrinkage, { fallbackData: shrinkageData });

  if (loading) return <LoadingPanel label="Loading shrinkage and yield report…" />;

  return (
    <div className="space-y-6">
      <Surface className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-8">
            <SectionHeading
              eyebrow="Yield discipline"
              title="Expected versus actual output by location"
              description="Shrinkage is where the command center proves it can separate supplier problems from kitchen execution. Chicken trim in South End remains the clearest operational demo moment."
            />
          </div>
          <div className="border-t border-white/8 bg-white/[0.03] p-6 xl:border-l xl:border-t-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">Interpretation</p>
            <p className="mt-3 text-sm leading-7 text-zinc-300">Negative yield variance pushes effective plate cost higher even when invoice pricing stays stable. That distinction helps the operator act on training, prep process, or receiving discipline.</p>
          </div>
        </div>
      </Surface>

      <PageStateBanner usingFallback={usingFallback} error={error} />

      <section className="grid gap-4 xl:grid-cols-2">
        {data.summary.map((item) => (
          <MetricCard key={item.title} {...item} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface>
          <SectionHeading
            eyebrow="Loss table"
            title="Location comparison"
            description="Rows are sorted by avoidable dollar loss so operators can prioritize intervention."
          />
          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/8">
                <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.24em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Ingredient</th>
                    <th className="px-4 py-3 font-medium">Expected yield</th>
                    <th className="px-4 py-3 font-medium">Actual yield</th>
                    <th className="px-4 py-3 font-medium">Variance</th>
                    <th className="px-4 py-3 font-medium">Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 bg-black/10">
                  {data.rows.map((row) => (
                    <tr key={`${row.location}-${row.ingredient}`} className="transition hover:bg-white/[0.04]">
                      <td className="px-4 py-4 text-sm text-white">{row.location}</td>
                      <td className="px-4 py-4 text-sm text-zinc-300">{row.ingredient}</td>
                      <td className="px-4 py-4 font-mono text-sm text-zinc-200">{row.expectedYield.toFixed(1)}%</td>
                      <td className="px-4 py-4 font-mono text-sm text-zinc-200">{row.actualYield.toFixed(1)}%</td>
                      <td className="px-4 py-4 font-mono text-sm text-red-300">{row.variancePct.toFixed(1)}%</td>
                      <td className="px-4 py-4 font-mono text-sm text-white">{formatCurrencyCompact(row.lossValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Surface>

        <Surface>
          <SectionHeading
            eyebrow="Yield spread"
            title="Avoidable loss by ingredient"
            description="The bar view makes it obvious that chicken and avocado handling deserve the next operational pass."
          />
          <div className="mt-6 h-80">
            <BarChart
              className="h-80"
              data={data.rows.map((row) => ({ ingredient: `${row.location} · ${row.ingredient}`, lossValue: row.lossValue }))}
              index="ingredient"
              categories={['lossValue']}
              colors={['rose']}
              showLegend={false}
              valueFormatter={formatCurrencyCompact}
              yAxisWidth={64}
            />
          </div>
        </Surface>
      </section>
    </div>
  );
}
