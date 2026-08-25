/**
 * Design reminder: this is the hero analytical view; prioritize full-width tables, benchmark overlays, and contextual drill-down instead of symmetric card grids.
 */
import { BarChart, DonutChart } from '@tremor/react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileUp,
  Link2,
  LoaderCircle,
  RefreshCw,
  Save,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ingestionQueueData,
  marginDrilldowns,
  marginGapData,
  savedFilterPresets,
  type IngestionQueueItem,
  type SavedFilterPreset,
} from '@/data/mockData';
import { useHostGraphData } from '@/hooks/useHostGraphData';
import { configuredHostGraphMode } from '@/lib/runtimeMode';
import { api, type InvoiceJobStatusResponse, type InvoiceUploadResponse } from '@/services/api';
import {
  formatPercent,
  HeroPanel,
  LoadingPanel,
  PageStateBanner,
  SectionHeading,
  SeverityBadge,
  Surface,
} from '@/components/dashboard-primitives';

const defaultFilters = {
  location: 'All Boston locations',
  dateFrom: '2026-03-01',
  dateTo: '2026-03-31',
  category: 'All categories',
};

const locations = ['All Boston locations', 'Back Bay', 'South End', 'Seaport', 'Cambridge', 'Beacon Hill'];
const categories = ['All categories', 'Dairy', 'Protein', 'Produce', 'Dry goods'];
const presetStorageKey = 'hostgraph-margin-gap-presets';
const queueStorageKey = configuredHostGraphMode === 'DEMO' ? 'hostgraph-ingestion-queue-demo' : 'hostgraph-ingestion-queue-live';

type FilterKey = keyof typeof defaultFilters;
type MarginFilters = typeof defaultFilters;
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';
type QueueSourceState = 'probing' | 'live' | 'degraded' | 'demo';

function readFilters(searchParams: URLSearchParams): MarginFilters {
  return {
    location: searchParams.get('location') || defaultFilters.location,
    dateFrom: searchParams.get('dateFrom') || defaultFilters.dateFrom,
    dateTo: searchParams.get('dateTo') || defaultFilters.dateTo,
    category: searchParams.get('category') || defaultFilters.category,
  };
}

function usePersistentState<T>(key: string, fallbackValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallbackValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function buildPresetName(filters: MarginFilters) {
  const location = filters.location === defaultFilters.location ? 'Portfolio' : filters.location;
  const category = filters.category === defaultFilters.category ? 'All categories' : filters.category;
  return `${location} · ${category} · ${filters.dateFrom}`;
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function normalizeQueueStatus(value: unknown): IngestionQueueItem['status'] {
  if (typeof value !== 'string') return 'queued';
  const normalized = value.toLowerCase();
  if (normalized === 'queued' || normalized === 'parsing' || normalized === 'review' || normalized === 'completed' || normalized === 'failed') {
    return normalized;
  }
  return 'queued';
}

function inferDocumentType(file: File) {
  if (file.type.includes('pdf')) return 'Invoice PDF';
  if (file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv')) return 'CSV export';
  if (file.type.startsWith('image/')) return 'Mobile image';
  return 'Uploaded document';
}

function normalizeQueueSource(value: unknown): IngestionQueueItem['source'] {
  if (value === 'upload' || value === 'email' || value === 'erp') return value;
  return 'upload';
}

function buildQueueKey(item: { id?: string; jobId?: string }) {
  return (typeof item.jobId === 'string' && item.jobId.trim().length > 0 ? item.jobId : undefined) ??
    (typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : undefined) ??
    '';
}

function normalizeLiveQueueItem(
  item: {
    id?: string;
    jobId?: string;
    fileName?: string;
    source?: IngestionQueueItem['source'] | string;
    uploadedAt?: string;
    status?: IngestionQueueItem['status'] | string;
    parsingStatus?: InvoiceJobStatusResponse['parsingStatus'];
    state?: InvoiceJobStatusResponse['state'];
    location?: string;
    vendor?: string;
    documentType?: string;
    detail?: string;
    message?: InvoiceJobStatusResponse['message'];
  },
  existing?: IngestionQueueItem,
): IngestionQueueItem {
  const queueKey = buildQueueKey(item);

  return {
    id: queueKey || existing?.id || `queue-${Date.now()}`,
    fileName:
      typeof item.fileName === 'string' && item.fileName.trim().length > 0
        ? item.fileName
        : existing?.fileName ?? 'Invoice document',
    source: normalizeQueueSource(item.source ?? existing?.source),
    uploadedAt:
      typeof item.uploadedAt === 'string' && item.uploadedAt.trim().length > 0
        ? item.uploadedAt
        : existing?.uploadedAt ?? new Date().toISOString(),
    status: normalizeQueueStatus(item.status ?? item.parsingStatus ?? item.state ?? existing?.status),
    location:
      typeof item.location === 'string' && item.location.trim().length > 0
        ? item.location
        : existing?.location ?? 'Portfolio',
    vendor:
      typeof item.vendor === 'string' && item.vendor.trim().length > 0
        ? item.vendor
        : existing?.vendor ?? 'Vendor pending parse',
    documentType:
      typeof item.documentType === 'string' && item.documentType.trim().length > 0
        ? item.documentType
        : existing?.documentType ?? 'Invoice document',
    detail:
      typeof item.detail === 'string' && item.detail.trim().length > 0
        ? item.detail
        : typeof item.message === 'string' && item.message.trim().length > 0
          ? item.message
          : existing?.detail ?? 'Awaiting ingestion status update from the parsing pipeline.',
    jobId:
      typeof item.jobId === 'string' && item.jobId.trim().length > 0
        ? item.jobId
        : existing?.jobId,
  };
}

function mergeQueueItems(priorityItems: IngestionQueueItem[], existingItems: IngestionQueueItem[]) {
  const merged = new Map<string, IngestionQueueItem>();

  [...existingItems, ...priorityItems].forEach((item) => {
    merged.set(buildQueueKey(item) || item.id, item);
  });

  return Array.from(merged.values())
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 12);
}

function buildQueueItemFromUpload(
  file: File,
  response: InvoiceUploadResponse,
  currentLocation: string,
): IngestionQueueItem {
  const hintedStatus = normalizeQueueStatus(response.status ?? response.parsingStatus ?? response.state);
  const message =
    typeof response.message === 'string' && response.message.trim().length > 0
      ? response.message
      : 'Invoice handed off to the ingestion pipeline.';

  return {
    id:
      typeof response.jobId === 'string' && response.jobId.trim().length > 0
        ? response.jobId
        : `upload-${Date.now()}`,
    fileName:
      typeof response.fileName === 'string' && response.fileName.trim().length > 0
        ? response.fileName
        : file.name,
    source: 'upload',
    uploadedAt: new Date().toISOString(),
    status: hintedStatus,
    location: currentLocation === defaultFilters.location ? 'Portfolio' : currentLocation,
    vendor: typeof response.vendor === 'string' && response.vendor.trim().length > 0 ? response.vendor : 'Vendor pending parse',
    documentType: inferDocumentType(file),
    detail: message,
    jobId: typeof response.jobId === 'string' ? response.jobId : undefined,
  };
}

function QueueStatusDot({ status }: { status: IngestionQueueItem['status'] }) {
  const tone: Record<IngestionQueueItem['status'], string> = {
    queued: 'bg-zinc-400',
    parsing: 'bg-cyan-400',
    review: 'bg-amber-400',
    completed: 'bg-emerald-400',
    failed: 'bg-red-400',
  };

  return <span className={`inline-block size-2.5 rounded-full ${tone[status]}`} />;
}

function InvoiceUploadPanel({
  location,
  onQueued,
  enabled,
}: {
  location: string;
  onQueued: (item: IngestionQueueItem) => void;
  enabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadMessage, setUploadMessage] = useState(
    enabled
      ? 'Drop an invoice PDF, image, or CSV to send it to the backend ingestion endpoint.'
      : 'Invoice ingestion is disabled in DEMO mode so synthetic review cannot mutate live systems.',
  );
  const [uploadMeta, setUploadMeta] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!enabled) {
        setUploadStatus('error');
        setUploadMessage('Switch to LIVE mode with an authorized backend before uploading invoices.');
        return;
      }

      setFileName(file.name);
      setUploadStatus('uploading');
      setUploadMeta(null);
      setUploadMessage(`Uploading ${file.name} to HostGraph ingestion…`);

      try {
        const response = await api.uploadInvoice(file);
        const queueItem = buildQueueItemFromUpload(file, response, location);
        const responseMeta = [
          queueItem.jobId ? `Job ${queueItem.jobId}` : null,
          `Status ${queueItem.status}`,
          queueItem.vendor,
        ]
          .filter(Boolean)
          .join(' · ');

        onQueued(queueItem);
        setUploadStatus('success');
        setUploadMessage(queueItem.detail);
        setUploadMeta(responseMeta || null);
      } catch (error) {
        setUploadStatus('error');
        setUploadMessage(error instanceof Error ? error.message : 'Invoice upload failed.');
        setUploadMeta('Live ingestion failed. No synthetic queue item was created.');
      }
    },
    [enabled, location, onQueued],
  );

  const handleInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) await processFile(file);
      event.target.value = '';
    },
    [processFile],
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) await processFile(file);
    },
    [processFile],
  );

  const statusStyles: Record<UploadStatus, string> = {
    idle: 'border-white/10 bg-white/[0.03] text-zinc-300',
    uploading: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
    success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    error: 'border-red-400/30 bg-red-400/10 text-red-100',
  };

  return (
    <Surface className="h-full">
      <SectionHeading
        eyebrow="Live ingestion"
        title="Invoice dropzone"
        description={enabled
          ? 'Uploads post to the authorized live ingestion endpoint and enter the operator queue for review.'
          : 'DEMO mode is read-only. Invoice upload is intentionally disabled to keep synthetic review isolated from live systems.'}
      />
      <div className="mt-6 space-y-4">
        <div
          aria-disabled={!enabled}
          onDragOver={(event) => {
            if (!enabled) return;
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            if (enabled) void handleDrop(event);
          }}
          onClick={() => {
            if (enabled) inputRef.current?.click();
          }}
          className={`group rounded-[28px] border border-dashed px-6 py-8 transition ${enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-65'} ${
            isDragging
              ? 'border-emerald-400/60 bg-emerald-400/10'
              : 'border-white/12 bg-black/20 hover:border-emerald-400/30 hover:bg-white/[0.03]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,image/*"
            disabled={!enabled}
            onChange={(event) => void handleInputChange(event)}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-emerald-200 transition group-hover:border-emerald-400/30 group-hover:bg-emerald-400/10">
              <UploadCloud className="size-6" />
            </div>
            <p className="mt-4 text-base font-medium text-white">{enabled ? 'Drop invoice files here or click to browse' : 'Live invoice ingestion disabled in DEMO'}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">{enabled ? 'Requests post to /api/v1/invoices/upload and are tracked in the live queue.' : 'Switch to an authorized LIVE configuration before sending any customer invoice data.'}</p>
            {fileName ? <p className="mt-4 font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">Most recent file: {fileName}</p> : null}
          </div>
        </div>

        <div className={`rounded-2xl border px-4 py-4 ${statusStyles[uploadStatus]}`}>
          <div className="flex items-start gap-3">
            {uploadStatus === 'uploading' ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" /> : uploadStatus === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : uploadStatus === 'error' ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <FileUp className="mt-0.5 size-4 shrink-0" />}
            <div className="space-y-1">
              <p className="text-sm font-medium">{uploadMessage}</p>
              {uploadMeta ? <p className="font-mono text-xs uppercase tracking-[0.2em] text-current/80">{uploadMeta}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function IngestionQueuePanel({
  items,
  liveState,
  syncError,
  lastSyncedAt,
  refreshing,
  onRefresh,
}: {
  items: IngestionQueueItem[];
  liveState: QueueSourceState;
  syncError: string | null;
  lastSyncedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  const liveTone = liveState === 'live'
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
    : liveState === 'probing'
      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
      : liveState === 'demo'
        ? 'border-violet-400/30 bg-violet-400/10 text-violet-100'
        : 'border-amber-400/30 bg-amber-400/10 text-amber-100';

  const liveLabel = liveState === 'live'
    ? 'Live status polling'
    : liveState === 'probing'
      ? 'Checking queue API'
      : liveState === 'demo'
        ? 'Synthetic demo queue'
        : 'Live queue degraded';

  return (
    <Surface className="h-full">
      <SectionHeading
        eyebrow="Queue"
        title="Invoice parsing queue"
        description={liveState === 'demo'
          ? 'Seeded records are explicitly synthetic and isolated in the DEMO-only storage namespace.'
          : 'The live queue contains only current or previously observed live ingestion records. No demo records are substituted on failure.'}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] ${liveTone}`}>{liveLabel}</span>
            <button
              type="button"
              disabled={liveState === 'demo'}
              onClick={() => void onRefresh()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-100 transition hover:border-cyan-400/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh queue
            </button>
          </div>
        }
      />
      <div className="mt-4 space-y-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
        <p>{lastSyncedAt ? `Last sync ${formatTimestamp(lastSyncedAt)}` : liveState === 'demo' ? 'Synthetic queue — no live sync attempted' : 'No live queue sync recorded yet'}</p>
        {syncError ? <p className="text-amber-200/90">Last queue sync error: {syncError}</p> : null}
      </div>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-6 text-sm text-zinc-500">No verified live queue records are available.</div>
        ) : items.slice(0, 6).map((item) => (
          <article key={item.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{item.fileName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-zinc-500">{item.location} · {item.vendor} · {item.documentType}</p>
              </div>
              <div className="flex items-center gap-2">
                <QueueStatusDot status={item.status} />
                <SeverityBadge severity={item.status === 'failed' ? 'critical' : item.status === 'review' ? 'warning' : item.status === 'completed' ? 'stable' : 'info'} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{item.detail}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <span>{formatTimestamp(item.uploadedAt)}</span>
              <span>Source {item.source}</span>
              {item.jobId ? <span>Job {item.jobId}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </Surface>
  );
}

export default function MarginGapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = usePersistentState<SavedFilterPreset[]>(presetStorageKey, savedFilterPresets);
  const initialQueue = configuredHostGraphMode === 'DEMO' ? ingestionQueueData.items : [];
  const [queueItems, setQueueItems] = usePersistentState<IngestionQueueItem[]>(queueStorageKey, initialQueue);
  const queueItemsRef = useRef(queueItems);
  const [queueLiveState, setQueueLiveState] = useState<QueueSourceState>(configuredHostGraphMode === 'DEMO' ? 'demo' : 'probing');
  const [queueSyncError, setQueueSyncError] = useState<string | null>(null);
  const [queueLastSyncedAt, setQueueLastSyncedAt] = useState<string | null>(null);
  const [queueRefreshing, setQueueRefreshing] = useState(false);

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const updateSearch = useCallback(
    (updates: Partial<Record<FilterKey | 'ingredientId', string | null>>, options?: { replace?: boolean; resetIngredient?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || (key in defaultFilters && value === defaultFilters[key as FilterKey])) {
          next.delete(key);
          return;
        }
        next.set(key, value);
      });
      if (options?.resetIngredient) next.delete('ingredientId');
      setSearchParams(next, { replace: options?.replace ?? true });
    },
    [searchParams, setSearchParams],
  );

  const fetchMarginGap = useCallback(
    () => api.getMarginGap({ location: filters.location, dateFrom: filters.dateFrom, dateTo: filters.dateTo, category: filters.category }),
    [filters.category, filters.dateFrom, filters.dateTo, filters.location],
  );

  const marginResponse = useHostGraphData(fetchMarginGap, {
    fallbackData: marginGapData,
    dependencies: [filters.location, filters.dateFrom, filters.dateTo, filters.category],
  });

  const activeId = searchParams.get('ingredientId') || marginResponse.data.rows[0]?.ingredientId || '';

  useEffect(() => {
    if (!marginResponse.data.rows.length) return;
    const activeExists = marginResponse.data.rows.some((row) => row.ingredientId === activeId);
    if (!activeExists) updateSearch({ ingredientId: marginResponse.data.rows[0]?.ingredientId ?? null }, { replace: true });
  }, [activeId, marginResponse.data.rows, updateSearch]);

  const fetchDrilldown = useCallback(() => api.getMarginGapDrilldown(activeId), [activeId]);
  const drilldownResponse = useHostGraphData(fetchDrilldown, {
    fallbackData: marginDrilldowns[activeId] ?? marginDrilldowns['mozz-001'],
    dependencies: [activeId],
    enabled: Boolean(activeId),
  });

  const overlayData = useMemo(
    () => marginResponse.data.benchmarkOverlay.map((slice) => ({ ...slice, value: Number(slice.value.toFixed(1)) })),
    [marginResponse.data.benchmarkOverlay],
  );

  const sortedQueueItems = useMemo(
    () => [...queueItems].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [queueItems],
  );

  useEffect(() => {
    queueItemsRef.current = queueItems;
  }, [queueItems]);

  const pollQueue = useCallback(async () => {
    if (configuredHostGraphMode === 'DEMO') {
      setQueueLiveState('demo');
      setQueueSyncError(null);
      return;
    }

    setQueueRefreshing(true);
    let syncedFromApi = false;
    let observedError: string | null = null;

    try {
      const response = await api.getInvoiceQueue();
      setQueueItems((current) => {
        const liveItems = response.items.map((item) => {
          const existing = current.find((candidate) => buildQueueKey(candidate) === buildQueueKey(item));
          return normalizeLiveQueueItem(item, existing);
        });
        return mergeQueueItems(liveItems, current);
      });
      setQueueLiveState('live');
      setQueueSyncError(null);
      setQueueLastSyncedAt(new Date().toISOString());
      syncedFromApi = true;
    } catch (error) {
      observedError = error instanceof Error ? error.message : 'Unable to load invoice queue';
    }

    if (!syncedFromApi) {
      const trackedJobs = queueItemsRef.current.filter((item) => item.jobId && item.status !== 'completed' && item.status !== 'failed').slice(0, 6);
      if (trackedJobs.length > 0) {
        const results = await Promise.allSettled(trackedJobs.map((item) => api.getInvoiceJobStatus(item.jobId!)));
        const liveUpdates = results.flatMap((result, index) => {
          if (result.status !== 'fulfilled') {
            observedError = observedError ?? (result.reason instanceof Error ? result.reason.message : 'Unable to refresh invoice status');
            return [];
          }
          return [normalizeLiveQueueItem(result.value, trackedJobs[index])];
        });
        if (liveUpdates.length > 0) {
          setQueueItems((current) => mergeQueueItems(liveUpdates, current));
          setQueueLiveState('live');
          setQueueSyncError(null);
          setQueueLastSyncedAt(new Date().toISOString());
          syncedFromApi = true;
        }
      }
    }

    if (!syncedFromApi) {
      setQueueLiveState('degraded');
      setQueueSyncError(observedError);
    }
    setQueueRefreshing(false);
  }, [setQueueItems]);

  useEffect(() => {
    if (configuredHostGraphMode === 'DEMO') {
      setQueueLiveState('demo');
      return;
    }
    void pollQueue();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pollQueue();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [pollQueue]);

  const handleFilterChange = useCallback((key: FilterKey, value: string) => updateSearch({ [key]: value }, { resetIngredient: true }), [updateSearch]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 1500);
    } catch {
      setShareState('idle');
    }
  }, []);

  const handleSavePreset = useCallback(() => {
    const name = presetName.trim() || buildPresetName(filters);
    const nextPreset: SavedFilterPreset = { id: `preset-${Date.now()}`, name, filters, ingredientId: activeId || undefined, updatedAt: new Date().toISOString() };
    setPresets((current) => [nextPreset, ...current.filter((preset) => preset.name !== name)].slice(0, 8));
    setPresetName('');
  }, [activeId, filters, presetName, setPresets]);

  const handleApplyPreset = useCallback((preset: SavedFilterPreset) => {
    updateSearch({
      location: preset.filters.location,
      dateFrom: preset.filters.dateFrom,
      dateTo: preset.filters.dateTo,
      category: preset.filters.category,
      ingredientId: preset.ingredientId ?? null,
    }, { replace: false });
  }, [updateSearch]);

  const handleDeletePreset = useCallback((presetId: string) => {
    setPresets((current) => current.filter((preset) => preset.id !== presetId));
  }, [setPresets]);

  const handleQueueItem = useCallback((item: IngestionQueueItem) => {
    setQueueItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)].slice(0, 12));
  }, [setQueueItems]);

  if (marginResponse.loading) return <LoadingPanel label="Loading margin-gap hero view…" />;

  const marginSourceLabel = marginResponse.usingFallback
    ? 'Synthetic demo data'
    : marginResponse.error
      ? 'Live source degraded'
      : 'Validated live API';

  return (
    <div className="space-y-6">
      <HeroPanel
        eyebrow="Hero view"
        title="Where actual cost breaks away from theory"
        description="The Margin Gap report turns procurement leakage into an operator workflow. Filters are mirrored in the URL, presets can be saved locally, and live invoice queue state remains isolated from synthetic demo history."
        image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 720'%3E%3Crect width='1200' height='720' fill='%23070b12'/%3E%3Ccircle cx='930' cy='160' r='180' fill='%2306b6d4' fill-opacity='0.14'/%3E%3Ccircle cx='260' cy='500' r='260' fill='%2310b981' fill-opacity='0.12'/%3E%3Cpath d='M0 520 C220 420 420 640 720 500 C900 420 1030 450 1200 360 L1200 720 L0 720 Z' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm text-zinc-300">
            <span className="block font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">Location</span>
            <select value={filters.location} onChange={(event) => handleFilterChange('location', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40">
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span className="block font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">Date from</span>
            <input type="date" value={filters.dateFrom} onChange={(event) => handleFilterChange('dateFrom', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40" />
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span className="block font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">Date to</span>
            <input type="date" value={filters.dateTo} onChange={(event) => handleFilterChange('dateTo', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40" />
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span className="block font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">Category</span>
            <select value={filters.category} onChange={(event) => handleFilterChange('category', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40">
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setSearchParams(new URLSearchParams())} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200 transition hover:border-emerald-400/30 hover:text-white"><RefreshCw className="size-4" />Reset filters</button>
          <button type="button" onClick={() => void handleCopyLink()} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200 transition hover:border-cyan-400/30 hover:text-white">{shareState === 'copied' ? <Copy className="size-4" /> : <Link2 className="size-4" />}{shareState === 'copied' ? 'Share link copied' : 'Copy share link'}</button>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-zinc-300">{marginSourceLabel}</span>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">URL state: {searchParams.toString() || 'defaults applied'}</p>
        </div>
      </HeroPanel>

      <PageStateBanner usingFallback={marginResponse.usingFallback || drilldownResponse.usingFallback} error={marginResponse.error || drilldownResponse.error} />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <InvoiceUploadPanel location={filters.location} onQueued={handleQueueItem} enabled={configuredHostGraphMode === 'LIVE'} />
        <IngestionQueuePanel items={sortedQueueItems} liveState={queueLiveState} syncError={queueSyncError} lastSyncedAt={queueLastSyncedAt} refreshing={queueRefreshing} onRefresh={pollQueue} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Surface>
          <SectionHeading eyebrow="Operator memory" title="Saved filter presets" description="Store recurring analytical slices locally so operators can jump back to a known problem state without rebuilding filters by hand." />
          <div className="mt-6 flex flex-col gap-3 lg:flex-row">
            <input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder={buildPresetName(filters)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/40" />
            <button type="button" onClick={handleSavePreset} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/15"><Save className="size-4" />Save current view</button>
          </div>
          <div className="mt-6 space-y-3">
            {presets.map((preset) => (
              <div key={preset.id} className="flex flex-col gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{preset.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-zinc-500">{preset.filters.location} · {preset.filters.category} · {preset.filters.dateFrom} → {preset.filters.dateTo}</p>
                  <p className="mt-2 text-sm text-zinc-400">{preset.ingredientId ? `Focused ingredient: ${preset.ingredientId}` : 'No fixed ingredient focus saved.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">Updated {formatTimestamp(preset.updatedAt)}</span>
                  <button type="button" onClick={() => handleApplyPreset(preset)} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-100 transition hover:border-cyan-400/30 hover:text-white">Apply preset</button>
                  <button type="button" onClick={() => handleDeletePreset(preset.id)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm text-zinc-400 transition hover:border-red-400/30 hover:text-red-200"><Trash2 className="size-4" />Delete</button>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
          <SectionHeading eyebrow="Shareable state" title="URL-synced analytical context" description="Teams can bookmark or pass around a precise slice of the report without reconstructing filters by hand. Ingredient focus remains encoded in the query string as well." />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Location</p><p className="mt-2 text-lg font-semibold text-white">{filters.location}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Date window</p><p className="mt-2 text-lg font-semibold text-white">{filters.dateFrom} → {filters.dateTo}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Focused ingredient</p><p className="mt-2 text-lg font-semibold text-white">{drilldownResponse.data.ingredient}</p></div>
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <Surface>
          <SectionHeading eyebrow="Variance ledger" title="Actual versus theoretical cost by ingredient" description="Click any row to load the right-hand drill-down. Every row comes from the active source mode; LIVE never substitutes repository fixture rows." />
          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/8 text-left">
                <thead className="bg-white/[0.03]"><tr className="text-xs uppercase tracking-[0.24em] text-zinc-500"><th className="px-4 py-3 font-medium">Ingredient</th><th className="px-4 py-3 font-medium">Location</th><th className="px-4 py-3 font-medium">Actual</th><th className="px-4 py-3 font-medium">Theory</th><th className="px-4 py-3 font-medium">Gap</th><th className="px-4 py-3 font-medium">Benchmark</th><th className="px-4 py-3 font-medium">Issue</th></tr></thead>
                <tbody className="divide-y divide-white/6 bg-black/10">
                  {marginResponse.data.rows.map((row) => {
                    const isActive = activeId === row.ingredientId;
                    return (
                      <tr key={row.ingredientId} onClick={() => updateSearch({ ingredientId: row.ingredientId }, { replace: false })} className={`cursor-pointer transition hover:bg-white/[0.04] ${isActive ? 'bg-emerald-400/8' : ''}`}>
                        <td className="px-4 py-4"><div><p className="font-medium text-white">{row.ingredient}</p><p className="mt-1 text-xs text-zinc-500">{row.category} · {row.vendor}</p></div></td>
                        <td className="px-4 py-4 text-sm text-zinc-300">{row.location}</td>
                        <td className="px-4 py-4 font-mono text-sm text-white">${row.actualCost.toFixed(2)}</td>
                        <td className="px-4 py-4 font-mono text-sm text-zinc-300">${row.theoreticalCost.toFixed(2)}</td>
                        <td className="px-4 py-4 font-mono text-sm text-red-300">{formatPercent(row.gapPct)}</td>
                        <td className="px-4 py-4 font-mono text-sm text-cyan-200">{formatPercent(row.benchmarkPct)}</td>
                        <td className="px-4 py-4 text-sm text-zinc-400">{row.issue}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Surface>

        <div className="space-y-6">
          <Surface>
            <SectionHeading eyebrow="Overlay" title="Benchmark context" description="This overlay keeps the operator focused on outliers that are materially beyond portfolio and peer ranges." />
            <div className="mt-6 h-64"><DonutChart className="mx-auto h-60" data={overlayData} category="value" index="name" colors={['rose', 'cyan', 'emerald']} valueFormatter={(value) => `${value} pts`} /></div>
          </Surface>

          {drilldownResponse.loading ? <LoadingPanel label="Loading ingredient drill-down…" /> : (
            <Surface>
              <SectionHeading eyebrow="Drill-down" title={drilldownResponse.data.ingredient} description={drilldownResponse.data.story} />
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Invoice delta</p><p className="mt-2 font-mono text-xl text-red-300">{drilldownResponse.data.invoiceDelta}</p></div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Yield delta</p><p className="mt-2 font-mono text-xl text-amber-200">{drilldownResponse.data.yieldDelta}</p></div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Benchmark delta</p><p className="mt-2 font-mono text-xl text-cyan-200">{drilldownResponse.data.benchmarkDelta}</p></div>
              </div>
              <div className="mt-6 h-64"><BarChart className="h-64" data={drilldownResponse.data.events} index="label" categories={['value']} colors={['emerald']} showLegend={false} valueFormatter={(value) => `${value}`} yAxisWidth={56} /></div>
            </Surface>
          )}
        </div>
      </section>
    </div>
  );
}
