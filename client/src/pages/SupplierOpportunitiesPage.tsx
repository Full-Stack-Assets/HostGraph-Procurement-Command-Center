import { useCallback } from 'react';
import { DataStatusRail } from '@/components/DataStatusRail';
import {
  HeroPanel,
  LoadingPanel,
  PageStateBanner,
  SectionHeading,
  Surface,
} from '@/components/dashboard-primitives';
import { supplierOpportunityFixture } from '@/data/procurementWorkspaceFixtures';
import { useHostGraphData } from '@/hooks/useHostGraphData';
import { api } from '@/services/api';

function formatMoney(value?: number, currency = 'USD') {
  if (value === undefined) return 'Unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SupplierOpportunitiesPage() {
  const fetchOpportunities = useCallback(() => api.getSupplierOpportunities(), []);
  const response = useHostGraphData(fetchOpportunities, { fallbackData: supplierOpportunityFixture });

  if (response.loading) return <LoadingPanel label="Loading supplier opportunity evidence…" />;

  const synthetic = response.data.source.kind === 'SYNTHETIC_FIXTURE';

  return (
    <div className="space-y-6">
      <HeroPanel
        eyebrow="Supplier comparison"
        title="Supplier opportunities"
        description="Compare candidate alternatives without converting an estimated price difference into a confirmed commercial outcome. Every record in this release remains DETECTED until source-backed review advances it elsewhere."
        image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 720'%3E%3Crect width='1200' height='720' fill='%23060817'/%3E%3Ccircle cx='950' cy='170' r='230' fill='%237c3aed' fill-opacity='.13'/%3E%3Ccircle cx='270' cy='530' r='220' fill='%2306b6d4' fill-opacity='.09'/%3E%3Cpath d='M250 350h260M690 350h260M510 350h180' stroke='%23fff' stroke-opacity='.18' stroke-width='18'/%3E%3Ccircle cx='250' cy='350' r='54' fill='%23fff' fill-opacity='.06'/%3E%3Ccircle cx='950' cy='350' r='54' fill='%23fff' fill-opacity='.06'/%3E%3C/svg%3E"
      >
        <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-zinc-300">
          <p className="font-medium text-white">{synthetic ? 'Synthetic donor-derived fixture' : 'Validated live supplier comparison source'}</p>
          <p className="mt-1 text-zinc-400">Detected opportunity means a candidate for review. Candidate alternative pricing, availability, equivalence, and commercial terms require source verification before action.</p>
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
          eyebrow="Detected opportunity ledger"
          title="Candidate alternatives"
          description="These comparisons expose possible variance for investigation. The interface does not promote DETECTED values into client-confirmed or realized outcomes."
          aside={<span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{response.data.source.recordCount} candidates</span>}
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {response.data.opportunities.map((opportunity) => (
            <article key={opportunity.id} className="rounded-[28px] border border-white/8 bg-gradient-to-br from-white/[0.045] to-white/[0.02] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-200">Detected opportunity</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{opportunity.currentItemName}</h3>
                  <p className="mt-2 text-sm text-zinc-400">Current vendor: {opportunity.currentVendorName}</p>
                </div>
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-amber-100">
                  {opportunity.evidenceState}
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Candidate alternative</p>
                <p className="mt-2 font-medium text-white">{opportunity.candidateVendorName}</p>
                <p className="mt-1 text-sm text-zinc-400">{opportunity.candidateItemName}</p>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/7 bg-black/20 p-3">
                  <dt className="text-xs text-zinc-500">Current price</dt>
                  <dd className="mt-2 font-mono text-sm text-white">{formatMoney(opportunity.currentPrice, opportunity.currency)}</dd>
                </div>
                <div className="rounded-2xl border border-white/7 bg-black/20 p-3">
                  <dt className="text-xs text-zinc-500">Candidate price</dt>
                  <dd className="mt-2 font-mono text-sm text-white">{formatMoney(opportunity.candidatePrice, opportunity.currency)}</dd>
                </div>
                <div className="rounded-2xl border border-white/7 bg-black/20 p-3">
                  <dt className="text-xs text-zinc-500">Estimated variance</dt>
                  <dd className="mt-2 font-mono text-sm text-violet-100">{formatMoney(opportunity.estimatedVariance, opportunity.currency)}</dd>
                </div>
              </dl>

              <p className="mt-5 text-sm leading-6 text-zinc-400">{opportunity.comparisonBasis}</p>
              <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                <span>Confidence {(opportunity.confidence * 100).toFixed(0)}%</span>
                <span>{opportunity.sourceRecordIds.length} source record{opportunity.sourceRecordIds.length === 1 ? '' : 's'}</span>
              </div>
            </article>
          ))}
        </div>
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
