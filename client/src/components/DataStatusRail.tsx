import React from 'react';
import type { TruthMode } from '@shared/contracts/core';
import { Surface } from '@/components/dashboard-primitives';

type SourceCoverage = {
  available: number;
  required: number;
};

export interface DataStatusRailProps {
  mode: TruthMode;
  fetchedAt: string | null;
  sourceCoverage: SourceCoverage | null;
  invoicesProcessed: number | null;
  invoicesAwaitingReview: number | null;
  dataExceptions: number | null;
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Unavailable';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(parsed);
}

function formatCount(value: number | null) {
  return value === null ? 'Unavailable' : value.toLocaleString('en-US');
}

function formatCoverage(value: SourceCoverage | null) {
  return value === null ? 'Unavailable' : `${value.available} / ${value.required}`;
}

export function DataStatusRail({
  mode,
  fetchedAt,
  sourceCoverage,
  invoicesProcessed,
  invoicesAwaitingReview,
  dataExceptions,
}: DataStatusRailProps) {
  const stateLabel =
    mode === 'DEMO'
      ? 'Synthetic demo data'
      : mode === 'LIVE'
        ? 'Validated live data'
        : 'Live source degraded';

  const stateDetail =
    mode === 'DEMO'
      ? 'Operational counts remain unavailable until backed by live source evidence.'
      : mode === 'LIVE'
        ? 'Values below are shown only when supplied by the current live evidence path.'
        : 'No synthetic substitution. Values remain limited to the last verified live evidence, if supplied.';

  const metrics = [
    { label: 'Source coverage', value: formatCoverage(sourceCoverage) },
    { label: 'Invoices processed', value: formatCount(invoicesProcessed) },
    { label: 'Awaiting review', value: formatCount(invoicesAwaitingReview) },
    { label: 'Data exceptions', value: formatCount(dataExceptions) },
  ];

  return (
    <Surface className="overflow-hidden p-0" aria-label="Data status">
      <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-zinc-300">
              {mode}
            </span>
            <p className="text-sm font-medium text-white">{stateLabel}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">{stateDetail}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Last verified fetch</p>
          <p className="mt-1 font-mono text-xs text-zinc-300">{formatTimestamp(fetchedAt)}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-white/8 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 px-4 py-4">
            <dt className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{metric.label}</dt>
            <dd className="mt-2 truncate font-mono text-sm font-medium text-zinc-100">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}
