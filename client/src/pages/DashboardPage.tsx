/**
 * Review interface: HostGraph procurement and margin intelligence dashboard.
 */
import { DonutChart } from '@tremor/react';
import {
  AlertTriangle,
  CircleDollarSign,
  DatabaseZap,
  Gauge,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useCallback } from 'react';
import { api } from '@/services/api';
import { dashboardSummary, marginGapData } from '@/data/mockData';
import { useFetch } from '@/hooks/useFetch';
import {
  LoadingPanel,
  PageStateBanner,
  SeverityBadge,
  Surface,
} from '@/components/dashboard-primitives';

interface KpiCardProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: 'emerald' | 'violet' | 'rose';
}

function KpiCard({ label, value, note, icon: Icon, tone = 'violet' }: KpiCardProps) {
  const toneClass = {
    emerald: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200',
    violet: 'border-violet-400/20 bg-violet-400/[0.06] text-violet-200',
    rose: 'border-rose-400/20 bg-rose-400/[0.06] text-rose-200',
  }[tone];

  return (
    <article className="rounded-2xl border border-white/8 bg-[#0b0e21]/82 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl border ${toneClass}`}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-4 text-[11px] leading-5 text-slate-500">{note}</p>
    </article>
  );
}

function categoryCostExposure() {
  const totals = new Map<string, number>();
  for (const row of marginGapData.rows) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.actualCost);
  }
  return Array.from(totals, ([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
}

export default function DashboardPage() {
  const fetchDashboard = useCallback(() => api.getDashboardSummary(), []);
  const { data, loading, error, usingFallback } = useFetch(fetchDashboard, { fallbackData: dashboardSummary });

  if (loading) return <LoadingPanel label="Booting procurement command center…" />;

  const savingsSignal = data.kpis.find((item) => item.title.toLowerCase().includes('potential savings'));
  const savings = savingsSignal?.value ?? 'Unavailable';
  const savingsNote = savingsSignal
    ? `${savingsSignal.delta}. ${savingsSignal.detail}`
    : 'The current dashboard response did not include a potential-savings field.';
  const alerts = data.actions.length;
  const products = data.leakingIngredients.slice(0, 4);
  const spendByCategory = categoryCostExposure();
  const maxDriverValue = Math.max(...data.marginBridge.map((driver) => Math.abs(driver.value)), 1);

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      <header className="flex flex-col gap-5 border-b border-white/7 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/8 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-200">
            <Sparkles className="size-3" /> Portfolio intelligence
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl xl:text-5xl">
            Restaurant Procurement &amp; Margin Intelligence Platform
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Turn every purchase into profit. Detect margin leaks, optimize spend, and keep every restaurant location inside a measurable operating range.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          <span className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-2">Boston portfolio</span>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2 text-emerald-200">
            {usingFallback ? 'Synthetic fallback data' : 'API response data'}
          </span>
        </div>
      </header>

      <PageStateBanner usingFallback={usingFallback} error={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Gross Margin"
          value="Not modeled"
          note="The current dashboard contract includes leakage, variance, and savings signals, but not revenue and cost-of-goods inputs for a defensible gross-margin calculation."
          icon={Gauge}
          tone="emerald"
        />
        <KpiCard
          label="Potential Savings"
          value={savings}
          note={savingsNote}
          icon={CircleDollarSign}
          tone="violet"
        />
        <KpiCard
          label="Active Alerts"
          value={String(alerts)}
          note="Count of prioritized action records in the current dashboard response."
          icon={AlertTriangle}
          tone="rose"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Surface className="border-white/8 bg-[#0b0e21]/88">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Performance</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Margin Over Time</h2>
            </div>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-3 py-1 text-[10px] text-amber-200">
              Historical series unavailable
            </span>
          </div>
          <div className="mt-7 rounded-2xl border border-dashed border-white/10 bg-black/15 p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.06] text-violet-200">
                <DatabaseZap className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-medium text-white">Historical margin series is not supplied</h3>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                  HostGraph will not manufacture a time series from unrelated values. This review surface shows the current exposure snapshot below until the API provides dated revenue and cost observations.
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4" aria-label="Current margin exposure by driver">
              {data.marginBridge.map((driver) => (
                <div key={driver.label}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                    <span className="text-slate-400">{driver.label}</span>
                    <span className="font-mono text-slate-200">${Math.abs(driver.value).toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300"
                      style={{ width: `${Math.max(8, (Math.abs(driver.value) / maxDriverValue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="border-white/8 bg-[#0b0e21]/88">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Fixture cost mix</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Spend by Category</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Computed from the actual-cost fields in the synthetic margin-gap rows. These are unit-cost exposure values, not total accounting spend.
            </p>
          </div>
          <DonutChart
            className="mx-auto mt-7 h-48"
            data={spendByCategory}
            category="value"
            index="name"
            colors={['violet', 'emerald', 'amber', 'cyan']}
            valueFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <div className="mt-5 space-y-3">
            {spendByCategory.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-white/7 bg-white/[0.025] px-3 py-2.5 text-xs">
                <span className="text-slate-400">{item.name}</span>
                <span className="font-mono text-slate-100">${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <Surface className="border-white/8 bg-[#0b0e21]/88">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Margin defense</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Top Products by Margin Impact</h2>
            <p className="mt-2 text-sm text-slate-500">Highest-value review items from the current dashboard response.</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Synthetic review fixtures</span>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/8 text-[9px] uppercase tracking-[0.18em] text-slate-600">
                <th className="px-3 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Location</th>
                <th className="px-3 py-3 font-medium">Margin impact</th>
                <th className="px-3 py-3 font-medium">Variance</th>
                <th className="px-3 py-3 font-medium">Issue</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={`${product.ingredient}-${product.location}`} className="border-b border-white/6 text-sm text-slate-300 last:border-0">
                  <td className="px-3 py-4 font-medium text-white">{product.ingredient}</td>
                  <td className="px-3 py-4 text-slate-500">{product.location}</td>
                  <td className="px-3 py-4 font-mono text-emerald-300">${product.leakage.toLocaleString()}</td>
                  <td className="px-3 py-4 font-mono text-rose-300">-{product.variancePct}%</td>
                  <td className="max-w-xl px-3 py-4 text-xs leading-5 text-slate-500">{product.issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      <section className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <Surface className="border-white/8 bg-[#0b0e21]/88">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Command queue</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Priority actions</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {data.actions.map((action) => (
              <article key={action.title} className="rounded-2xl border border-white/7 bg-white/[0.025] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium text-white">{action.title}</h3>
                  <SeverityBadge severity={action.severity} />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{action.description}</p>
                <p className="mt-4 text-[9px] uppercase tracking-[0.16em] text-slate-600">{action.owner} · {action.due}</p>
              </article>
            ))}
          </div>
        </Surface>

        <Surface className="border-white/8 bg-gradient-to-br from-violet-500/[0.08] to-cyan-400/[0.035]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-violet-200">Operating brief</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">Detect margin leaks before they become monthly surprises.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">{data.narrative}</p>
          <p className="mt-5 text-[10px] uppercase tracking-[0.16em] text-slate-600">
            Values shown in this review are sourced from the current API response or the repository's explicitly labeled synthetic fallback fixtures.
          </p>
        </Surface>
      </section>
    </div>
  );
}
