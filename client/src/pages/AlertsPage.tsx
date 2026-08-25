/**
 * Design reminder: alerts should read like an operations pulse wall—severity first, compact narrative second, with strong contrast against the dark surface.
 */
import { useCallback } from 'react';
import { api } from '@/services/api';
import { alertsData } from '@/data/mockData';
import { useHostGraphData } from '@/hooks/useHostGraphData';
import { HeroPanel, LoadingPanel, PageStateBanner, SectionHeading, SeverityBadge, Surface } from '@/components/dashboard-primitives';

export default function AlertsPage() {
  const fetchAlerts = useCallback(() => api.getAlerts(), []);
  const { data, loading, error, usingFallback } = useHostGraphData(fetchAlerts, { fallbackData: alertsData });

  if (loading) return <LoadingPanel label="Syncing active alert feed…" />;

  return (
    <div className="space-y-6">
      <HeroPanel
        eyebrow="Alert pulse"
        title="Every active anomaly in one feed"
        description="The alert wall keeps the operator oriented around exceptions instead of averages. Use it as the opening frame when you want the story to start with urgency."
        image="https://d2xsxph8kpxj0f.cloudfront.net/310519663540603382/KRgpskTa3UjstPtv6w78ES/hostgraph-alerts-pulse-ATNXMeoLi5seV6giqm5WfA.webp"
      >
        <Surface className="bg-black/20">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">Current pulse</p>
          <p className="mt-3 text-sm leading-7 text-zinc-300">There are {data.alerts.filter((item) => item.severity === 'critical').length} critical signals in the queue. The strongest opener remains the mozzarella overbilling cluster across the Boston portfolio.</p>
        </Surface>
      </HeroPanel>

      <PageStateBanner usingFallback={usingFallback} error={error} />

      <Surface>
        <SectionHeading
          eyebrow="Feed"
          title="Active alerts"
          description="Alerts combine procurement, inventory, and operational anomalies so the buyer sees the full consequence chain in one stream."
        />
        <div className="mt-6 space-y-4">
          {data.alerts.map((alert) => (
            <div key={alert.id} className="rounded-[28px] border border-white/8 bg-gradient-to-r from-white/[0.04] to-white/[0.02] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-medium text-white">{alert.title}</h4>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{alert.detail}</p>
                </div>
                <SeverityBadge severity={alert.severity} />
              </div>
              <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                <span>{alert.location}</span>
                <span>{alert.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
