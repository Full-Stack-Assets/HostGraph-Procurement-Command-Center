# HostGraph Procurement Command Center

A live procurement cockpit focused on margin leakage, vendor drift, and store-level yield discipline across the Boston restaurant fleet. HostGraph surfaces where margin slips away first—contract drift, yield loss, missing credits, and reorder timing—enabling operators to see and act on procurement friction before it cascades into profitability gaps.

HostGraph is a dark-mode procurement intelligence frontend for restaurant operators. The app includes six views—Dashboard Summary, Margin Gap Report, Reorder Suggestions, Vendor Scorecard, Shrinkage & Yield, and Alerts—and is designed to connect to a backend API while still working as a standalone demo.

## Design direction

The chosen design philosophy is an **industrial neo-noir command center**: deep slate and zinc surfaces, restrained emerald and red accents, a persistent left rail, and dense but legible information hierarchy. Typography combines **Space Grotesk** for headings with **IBM Plex Sans** and **IBM Plex Mono** for operational detail.

## Views

| Route | View | Purpose |
| --- | --- | --- |
| `/` | Dashboard Summary | KPI cards, leaking ingredients, benchmark mix, action items |
| `/margin-gap` | Margin Gap Report | Hero analytical view with filters, cost table, benchmark overlay, drill-down |
| `/reorder` | Reorder Suggestions | Suggested buys, exhaustion timing, and inventory posture |
| `/vendors` | Vendor Scorecard | Supplier comparison, price trends, and drift alerts |
| `/shrinkage` | Shrinkage & Yield | Yield variance and avoidable loss by location |
| `/alerts` | Alerts | Active alert feed for procurement and operational anomalies |

## API integration

The frontend wraps these endpoints in `client/src/services/api.ts`:

| Method | Endpoint |
| --- | --- |
| GET | `/api/v1/dashboard/summary` |
| GET | `/api/v1/margin-gap` |
| GET | `/api/v1/margin-gap/:ingredientId/drilldown` |
| GET | `/api/v1/inventory/levels` |
| GET | `/api/v1/inventory/reorder-suggestions` |
| GET | `/api/v1/shrinkage-report` |
| GET | `/api/v1/benchmarks` |
| GET | `/api/v1/vendors/scorecard` |
| GET | `/api/v1/price-trends` |
| GET | `/api/v1/alerts` |
| POST | `/api/v1/invoices/upload` |

All page-level data access goes through `client/src/hooks/useFetch.ts`. The hook manages loading and error state, then gracefully falls back to `client/src/data/mockData.ts` whenever the API is unavailable.

## Running connected to the backend

1. Start the backend API locally on **`http://localhost:3000`**.
2. Start the frontend dev server:

```bash
pnpm install
pnpm dev
```

The Vite dev server runs on **`http://localhost:5173`** and proxies any `/api` request to `http://localhost:3000`.

## Running standalone with mock data

If the backend is not running, start the frontend normally:

```bash
pnpm install
pnpm dev
```

The app will attempt to call the API first. If those requests fail, each page automatically falls back to the built-in Boston restaurant-group mock data, including the demo “gotcha” stories around Sysco overbilling, chicken yield variance, and mozzarella price gouging.

## Technology Stack

| Component | Technology |
|-----------|----------|
| **Framework** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | shadcn/ui |
| **Routing** | React Router |
| **Build Tool** | Vite |
| **Charts & Visualization** | Tremor, Recharts |
| **HTTP Client** | Fetch API with custom hooks |
| **Production Static Server** | Express (optional) |

## Project Structure

```
client/
  public/           ← Favicon, robots.txt, manifest.json only
  src/
    pages/          ← Page-level components (Dashboard, MarginGap, etc.)
    components/     ← Reusable UI & shadcn/ui components
    contexts/       ← React contexts for global state
    hooks/          ← Custom React hooks (useFetch, usePersistentState, etc.)
    lib/            ← Utility helpers and formatters
    services/       ← API client and data fetching logic
    data/           ← Mock data and fallback fixtures
    App.tsx         ← Routes and top-level layout
    main.tsx        ← React entry point
    index.css       ← Global styles and design tokens
  index.html        ← HTML template with Google Fonts CDN
package.json        ← Dependencies and scripts
vite.config.ts      ← Vite configuration with API proxy
```

## Features & Enhancements

### Persisted Filter Presets

Operators can save and reuse filter combinations on the Margin Gap view. Presets are stored in browser localStorage and include location, vendor, time period, and metric selections. Operators can quickly switch between common filter sets without re-entering parameters each time.

### Invoice Ingestion Queue

The ingestion queue provides a unified view of all invoice uploads, parsing progress, and vendor extraction results. The queue persists upload history and displays real-time parsing status when the backend is available. If the backend is unavailable, the queue falls back to persisted history and mock parsing statuses.

### Live API Integration

Dashboard views attempt to fetch live data from the backend on page load and at regular intervals. If the backend is unavailable, views gracefully fall back to mock data. The application tracks sync state and displays indicators showing whether data is live, probing, or using persisted fallback.

### Route-Level Prefetching

Common navigation paths are prefetched on hover to reduce perceived latency when switching between views. The prefetch system is lazy and only loads data for routes that are likely to be visited next.

## Development Workflow

### Adding New Pages

Create a new page component in `client/src/pages/`:

```tsx
import { HeroPanel } from '@/components/HeroPanel';

export function MyNewPage() {
  return (
    <HeroPanel
      eyebrow="Section"
      title="My New Page"
      description="Page description here."
    />
  );
}
```

Register the route in `client/src/App.tsx`:

```tsx
import { MyNewPage } from '@/pages/MyNewPage';

// In the Router component:
<Route path="/my-new-page" component={MyNewPage} />
```

### Adding UI Components

Use shadcn/ui components from `@/components/ui/*` for consistency. Extend components as needed, but prefer composition over duplication.

### Styling

All styling uses Tailwind CSS utilities. Design tokens (colors, spacing, typography) are defined in `client/src/index.css` under `@layer base`. Maintain consistency by using existing tokens rather than hardcoding values.

### Data Fetching

Use the `useFetch` hook for API calls:

```tsx
import { useFetch } from '@/hooks/useFetch';
import { api } from '@/services/api';

function MyComponent() {
  const { data, loading, error } = useFetch(
    () => api.getMarginGapReport({ location: 'Boston' }),
    [/* dependencies */]
  );

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  return <div>{/* render data */}</div>;
}
```

## Performance Optimization

The application uses several strategies to maintain fast load times and smooth interactions:

**Code Splitting** — Chart-heavy routes and utility modules are lazy-loaded to reduce the initial JavaScript bundle. Route components are split automatically by Vite.

**Memoization** — Expensive computations and component renders are memoized with `useMemo` and `React.memo` to prevent unnecessary recalculations.

**Prefetching** — Common navigation paths are prefetched on hover to reduce perceived latency when switching between views.

**Caching** — API responses are cached in memory with configurable TTL. The cache is invalidated when filters change or when the user manually refreshes.

## Deployment

The application is a static frontend and can be deployed to any static hosting provider. The built assets in `dist/public/` contain everything needed to serve the application.

If you prefer deploying as a single Node service (instead of pure static hosting), `pnpm start` runs an Express server that serves `dist/public/` and provides an SPA fallback for client-side routes.

### Manus Hosting

The project is configured for deployment on Manus hosting with automatic domain provisioning and SSL termination.

### Custom Hosting

To deploy to a custom domain or external hosting provider:

1. Build the application: `pnpm build`
2. Upload the contents of `dist/public/` to your hosting provider
3. Configure your web server to serve `dist/public/index.html` for all routes (to support client-side routing)
4. Update the API proxy configuration if your backend is on a different domain

### Optional analytics

If you use Umami (or a compatible endpoint), set `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` (see `.env.example`). If these are not set, no analytics script is injected.

## Build and Verification

Use the following commands to verify the app compiles cleanly:

```bash
pnpm check
pnpm build
```

## Contributing

This is a public portfolio showcase and can accept external issues, design notes,
and contribution PRs for non-production experimentation.

- Create a feature branch from `main`
- Follow the existing code style and component patterns
- Ensure TypeScript types are correct: `pnpm check`
- Test your changes in the dev server before pushing
- Create a pull request with a clear description of changes

## License

This project is intentionally open for review and demonstration. Commercial
extensions and internal data integrations are controlled separately from this
public portfolio repository.

## Support & Feedback

For issues, feature requests, or feedback, please contact the development team or open an issue in the GitHub repository.

---

**HostGraph Procurement Command Center** — Built with React, Tailwind, and a focus on operational excellence in procurement.
