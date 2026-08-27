import { useCallback } from 'react';
import { DataStatusRail } from '@/components/DataStatusRail';
import {
  HeroPanel,
  LoadingPanel,
  PageStateBanner,
  SectionHeading,
  Surface,
} from '@/components/dashboard-primitives';
import { invoiceWorkspaceFixture } from '@/data/procurementWorkspaceFixtures';
import { useHostGraphData } from '@/hooks/useHostGraphData';
import { api } from '@/services/api';

function formatMoney(amount?: number, currency?: string) {
  if (amount === undefined || !currency) return 'Unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function stateTone(state: string) {
  if (state === 'VERIFIED') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  if (state === 'FAILED') return 'border-red-400/30 bg-red-400/10 text-red-100';
  if (state === 'REVIEW') return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
  return 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100';
}

export default function InvoicesPage() {
  const fetchInvoices = useCallback(() => api.getInvoicesWorkspace(), []);
  const response = useHostGraphData(fetchInvoices, { fallbackData: invoiceWorkspaceFixture });

  if (response.loading) return <LoadingPanel label="Loading invoice evidence workspace…" />;

  const verifiedCount = response.data.invoices.filter((invoice) => invoice.state === 'VERIFIED').length;
  const reviewCount = response.data.invoices.filter((invoice) => invoice.state === 'REVIEW').length;
  const exceptionCount = response.data.invoices.reduce((total, invoice) => total + invoice.exceptionCount, 0);
  const synthetic = response.data.source.kind === 'SYNTHETIC_FIXTURE';

  return (
    <div className="space-y-6">
      <HeroPanel
        eyebrow="Procurement evidence"
        title="Invoice workspace"
        description="Review invoice records, exception state, and source freshness without converting an observed variance into a confirmed recovery. This workspace is read-only in the reconciliation release."
        image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 720'%3E%3Crect width='1200' height='720' fill='%23060817'/%3E%3Ccircle cx='980' cy='140' r='210' fill='%237c3aed' fill-opacity='.14'/%3E%3Cpath d='M160 160h520v390H160z' fill='%23fff' fill-opacity='.04' stroke='%2367e8f9' stroke-opacity='.18'/%3E%3Cpath d='M230 260h380M230 340h280M230 420h330' stroke='%23fff' stroke-opacity='.16' stroke-width='18'/%3E%3C/svg%3E"
      >
        <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-zinc-300">
          <p className="font-medium text-white">{synthetic ? 'Synthetic donor-derived fixture' : 'Validated live invoice source'}</p>
          <p className="mt-1 text-zinc-400">No synthetic substitution is allowed when LIVE data is unavailable. The current source identity and timestamp remain visible below.</p>
        </div>
      </HeroPanel>

      <PageStateBanner usingFallback={response.usingFallback} error={response.error} />

      <DataStatusRail
        mode={response.mode}
        fetchedAt={response.fetchedAt}
        sourceCoverage={null}
        invoicesProcessed={verifiedCount}
        invoicesAwaitingReview={reviewCount}
        dataExceptions={exceptionCount}
      />

      <Surface>
        <SectionHeading
          eyebrow="Evidence ledger"
          title="Invoice records"
          description="Totals are displayed only when the source record supplies both an amount and currency. Exception counts are observations, not realized recoveries."
          aside={<span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{response.data.source.recordCount} source records</span>}
        />

        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/8 text-left">
              <thead className="bg-white/[0.03]">
                <tr className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Exceptions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6 bg-black/10">
                {response.data.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-white">{invoice.vendorName}</p>
                      <p className="mt-1 font-mono text-xs text-zinc-500">{invoice.sourceRecordId}</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-zinc-200">{invoice.invoiceNumber ?? 'Unavailable'}</td>
                    <td className="px-4 py-4 text-sm text-zinc-300">{invoice.documentDate}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${stateTone(invoice.state)}`}>
                        {invoice.state}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-white">{formatMoney(invoice.totalAmount, invoice.currency)}</td>
                    <td className="px-4 py-4 font-mono text-sm text-zinc-300">{invoice.exceptionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
