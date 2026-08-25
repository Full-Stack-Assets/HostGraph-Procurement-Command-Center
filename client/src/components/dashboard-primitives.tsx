/**
 * Design reminder: machined information surfaces, mono numerics, subtle glow accents, and strong contrast on dark glass panels.
 */
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';
import { AlertTriangle, Info, LoaderCircle, TriangleAlert, TrendingDown, TrendingUp } from 'lucide-react';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/8 bg-card/80 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function HeroPanel({
  eyebrow,
  title,
  description,
  image,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[34px] border border-white/8 bg-zinc-950 shadow-[0_24px_100px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="relative min-h-[320px] overflow-hidden p-6 sm:p-8 lg:p-10">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(90deg, rgba(4,7,11,0.94) 0%, rgba(4,7,11,0.82) 46%, rgba(4,7,11,0.46) 100%), url(${image})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(16,185,129,0.08),transparent_40%,rgba(239,68,68,0.08))]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-emerald-200/80">{eyebrow}</p>
              <div className="max-w-2xl space-y-4">
                <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h2>
                <p className="max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{description}</p>
              </div>
            </div>
            {children}
          </div>
        </div>
        <div className="border-t border-white/8 bg-black/25 p-6 lg:border-l lg:border-t-0">{children}</div>
      </div>
    </section>
  );
}

export function MetricCard({
  title,
  value,
  delta,
  detail,
  trend,
}: {
  title: string;
  value: string;
  delta: string;
  detail: string;
  trend: 'up' | 'down' | 'flat';
}) {
  const icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Info;
  const Icon = icon;
  const tone = trend === 'up' ? 'text-red-300' : trend === 'down' ? 'text-emerald-300' : 'text-zinc-300';

  return (
    <Surface className="group h-full transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <div className="mt-4 flex items-end gap-3">
            <p className="font-mono text-3xl font-semibold tracking-tight text-white">{value}</p>
            <span className={cn('mb-1 inline-flex items-center gap-1 text-xs font-medium', tone)}>
              <Icon className="size-3.5" />
              {delta}
            </span>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-zinc-500">
          Signal
        </span>
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-400">{detail}</p>
    </Surface>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-zinc-500">{eyebrow}</p>
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-white">{title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
        </div>
      </div>
      {aside}
    </div>
  );
}

export function PageStateBanner({ usingFallback, error }: { usingFallback?: boolean; error?: string | null }) {
  if (!usingFallback && !error) return null;

  if (usingFallback) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
        <Info className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">Synthetic demo data</p>
          <p className="mt-1 text-cyan-100/80">HostGraph is intentionally running repository fixtures. No live account data is represented.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">Live source degraded — no synthetic substitution</p>
        <p className="mt-1 text-amber-100/80">The current view is limited to the last verified live snapshot, if one exists.{error ? ` Last error: ${error}` : ''}</p>
      </div>
    </div>
  );
}

export function LoadingPanel({ label = 'Loading procurement intelligence…' }: { label?: string }) {
  return (
    <Surface className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-300">
        <LoaderCircle className="size-5 animate-spin text-emerald-300" />
        <span className="text-sm">{label}</span>
      </div>
    </Surface>
  );
}

export function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' | 'high' | 'medium' | 'low' | 'watch' | 'stable' }) {
  const styles: Record<string, string> = {
    critical: 'border-red-400/20 bg-red-400/10 text-red-200',
    warning: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    info: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
    high: 'border-red-400/20 bg-red-400/10 text-red-200',
    medium: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    low: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    watch: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    stable: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  };
  return <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.24em]', styles[severity])}>{severity}</Badge>;
}

export function EmptyCopy({ title, detail }: { title: string; detail: string }) {
  return (
    <Surface className="flex min-h-[220px] items-center justify-center text-center">
      <div className="max-w-md space-y-3">
        <AlertTriangle className="mx-auto size-8 text-zinc-500" />
        <h4 className="text-lg font-semibold text-white">{title}</h4>
        <p className="text-sm leading-6 text-zinc-400">{detail}</p>
      </div>
    </Surface>
  );
}
