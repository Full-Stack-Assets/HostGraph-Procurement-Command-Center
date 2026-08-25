/**
 * Design reminder: vendor view should feel networked and comparative, with drift detection elevated over decorative summary cards.
 */
import { LineChart } from '@tremor/react';
import { useCallback } from 'react';
import { api } from '@/services/api';
import { vendorData } from '@/data/mockData';
import { useHostGraphData } from '@/hooks/useHostGraphData';
import { HeroPanel, LoadingPanel, PageStateBanner, SectionHeading, SeverityBadge, Surface } from '@/components/dashboard-primitives';

export default function VendorsPage() {
  const fetchVendors = useCallback(() => api.getVendorsScorecard(), []);
  const { data, loading, error, usingFallback } = useHostGraphData(fetchVendors, { fallbackData: vendorData });

  if (loading) return <LoadingPanel label="Loading vendor network intelligence…" />;

  return (
    <div className="space-y-6">
      <HeroPanel
        eyebrow="Vendor network"
        title="Scorecards, price drift, and supplier accountability"
        description="The vendor scorecard keeps service quality and cost discipline in the same frame. Drift detection is what turns a static supplier report into a procurement control system."
        image="https://d2xsxph8kpxj0f.cloudfront.net/310519663540603382/KRgpskTa3UjstPtv6w78ES/hostgraph-vendor-network-4gKUJ8bWcc6RN7G3PScBaC.webp"
      >
        <Surface className="bg-black/20">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">Current headline</p>
          <p className="mt-3 text-sm leading-7 text-zinc-300">Sysco service remains acceptable, but invoice accuracy is the weakest in the fleet because mozzarella pricing drift continues after the catalog refresh.</p>
        </Surface>
      </HeroPanel>

      <PageStateBanner usingFallback={usingFallback} error={error} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface>
          <SectionHeading
            eyebrow="Scorecard"
            title="Vendor comparison"
            description="Service metrics and price discipline are shown together so the buyer can separate reliable vendors from expensive ones."
          />
          <div className="mt-6 space-y-4">
            {data.scorecard.map((vendorRow) => (
              <div key={vendorRow.vendor} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-medium text-white">{vendorRow.vendor}</h4>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{vendorRow.note}</p>
                  </div>
                  <SeverityBadge severity={vendorRow.priceDriftPct > 8 ? 'critical' : vendorRow.priceDriftPct > 5 ? 'warning' : 'info'} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">On time</p><p className="mt-2 font-mono text-xl text-white">{vendorRow.onTimePct}%</p></div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Fill rate</p><p className="mt-2 font-mono text-xl text-white">{vendorRow.fillRatePct}%</p></div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Price drift</p><p className="mt-2 font-mono text-xl text-red-300">{vendorRow.priceDriftPct}%</p></div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Invoice accuracy</p><p className="mt-2 font-mono text-xl text-cyan-200">{vendorRow.invoiceAccuracyPct}%</p></div>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <div className="space-y-6">
          <Surface>
            <SectionHeading
              eyebrow="Price trend"
              title="Commodity trendlines"
              description="Mozzarella is the standout anomaly in the demo because it decouples from the rest of the ingredient basket while service metrics stay relatively stable."
            />
            <div className="mt-6 h-80">
              <LineChart
                className="h-80"
                data={data.priceTrends}
                index="month"
                categories={['mozzarella', 'chicken', 'avocados']}
                colors={['rose', 'emerald', 'cyan']}
                yAxisWidth={56}
                valueFormatter={(value) => `$${value}`}
              />
            </div>
          </Surface>

          <Surface>
            <SectionHeading
              eyebrow="Drift feed"
              title="Supplier alerts"
              description="These notices are meant to trigger negotiation, credit recovery, or buy-shift decisions."
            />
            <div className="mt-6 space-y-4">
              {data.driftAlerts.map((alert) => (
                <div key={alert.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-medium text-white">{alert.title}</h4>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{alert.detail}</p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-zinc-500">{alert.location} · {alert.timestamp}</p>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </section>
    </div>
  );
}
