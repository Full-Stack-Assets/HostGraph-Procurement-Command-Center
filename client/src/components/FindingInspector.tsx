import React from 'react';
import type { TruthMode } from '@shared/contracts/core';
import type { Finding } from '@shared/contracts/findings';
import { Surface } from '@/components/dashboard-primitives';

export interface FindingInspectorProps {
  mode: TruthMode;
  finding: Finding | null;
  unavailableReason?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function valueState(finding: Finding) {
  return {
    detected: formatCurrency(finding.calculatedVariance),
    clientConfirmed:
      finding.evidenceState === 'CLIENT_CONFIRMED' || finding.evidenceState === 'REALIZED'
        ? formatCurrency(finding.calculatedVariance)
        : 'Not confirmed',
    realized: finding.evidenceState === 'REALIZED' ? formatCurrency(finding.calculatedVariance) : 'Not realized',
  };
}

export function FindingInspector({ mode, finding, unavailableReason }: FindingInspectorProps) {
  if (!finding) {
    return (
      <Surface aria-label="Finding evidence inspector">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-zinc-500">Evidence inspector</p>
        <h4 className="mt-3 text-lg font-semibold text-white">Evidence record unavailable</h4>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {unavailableReason ?? 'The current analytical row does not include a source-complete Finding record.'}
        </p>
      </Surface>
    );
  }

  const values = valueState(finding);
  const provenance = finding.provenance;

  return (
    <Surface aria-label="Finding evidence inspector" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-zinc-500">Evidence inspector</p>
          <h4 className="mt-2 text-lg font-semibold text-white">{finding.vendorId} · {finding.locationId}</h4>
          <p className="mt-1 text-sm text-zinc-400">Finding {finding.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
            {finding.evidenceState}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
            {finding.reviewerState}
          </span>
        </div>
      </div>

      {mode === 'DEMO' ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          <p className="font-medium">Synthetic demonstration only</p>
          <p className="mt-1 text-cyan-100/80">This record demonstrates the evidence model and does not represent a live client outcome.</p>
        </div>
      ) : mode === 'DEGRADED' ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium">Degraded live evidence</p>
          <p className="mt-1 text-amber-100/80">Interpret only against the provenance and timestamps below.</p>
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <dt className="text-xs text-zinc-500">Detected variance</dt>
          <dd className="mt-2 font-mono text-xl font-semibold text-white">{values.detected}</dd>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <dt className="text-xs text-zinc-500">Client-confirmed value</dt>
          <dd className="mt-2 font-mono text-sm font-medium text-zinc-200">{values.clientConfirmed}</dd>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <dt className="text-xs text-zinc-500">Realized value</dt>
          <dd className="mt-2 font-mono text-sm font-medium text-zinc-200">{values.realized}</dd>
        </div>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Calculation</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-zinc-500">Method</dt>
              <dd className="text-right font-mono text-zinc-300">{finding.calculationMethod}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-zinc-500">Version</dt>
              <dd className="text-right font-mono text-zinc-300">{finding.calculationVersion}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-zinc-500">Confidence</dt>
              <dd className="text-right font-mono text-zinc-300">{(finding.confidence * 100).toFixed(0)}%</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-zinc-500">Source period</dt>
              <dd className="text-right font-mono text-zinc-300">{finding.sourcePeriod.from} → {finding.sourcePeriod.to}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Provenance</p>
          <div className="mt-3 space-y-3">
            {provenance.map((entry) => (
              <div key={`${entry.sourceSystem}:${entry.sourceRecordId}`} className="space-y-1 text-sm">
                <p className="text-zinc-300">{entry.sourceSystem}</p>
                <p className="font-mono text-xs text-zinc-500">{entry.sourceRecordId}</p>
                <p className="break-all font-mono text-xs text-zinc-400">{entry.locator}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Surface>
  );
}
