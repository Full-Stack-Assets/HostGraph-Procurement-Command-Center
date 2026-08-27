/**
 * Design reminder: the whole app follows the industrial neo-noir command-center philosophy with a persistent left rail and dark analytical surfaces.
 */
import { Toaster } from '@/components/ui/sonner';
import { Suspense, lazy } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { HostGraphShell } from './components/HostGraphShell';
import { routeModules } from './lib/routePrefetch';
import { ThemeProvider } from './contexts/ThemeContext';
import NotFound from './pages/NotFound';

const DashboardPage = lazy(routeModules['/']);
const MarginGapPage = lazy(routeModules['/margin-gap']);
const InvoicesPage = lazy(routeModules['/invoices']);
const InventoryPage = lazy(routeModules['/inventory']);
const ReorderPage = lazy(routeModules['/reorder']);
const VendorsPage = lazy(routeModules['/vendors']);
const SupplierOpportunitiesPage = lazy(routeModules['/supplier-opportunities']);
const ShrinkagePage = lazy(routeModules['/shrinkage']);
const AlertsPage = lazy(routeModules['/alerts']);

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-zinc-800/80 bg-zinc-950/70 px-6 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-3 text-sm text-zinc-300">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
        Loading command-center module…
      </div>
    </div>
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route element={<HostGraphShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/margin-gap" element={<MarginGapPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/reorder" element={<ReorderPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/supplier-opportunities" element={<SupplierOpportunitiesPage />} />
            <Route path="/shrinkage" element={<ShrinkagePage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
