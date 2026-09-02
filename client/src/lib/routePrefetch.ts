/**
 * Design reminder: navigation should feel immediate; preload the most common analytical views from the left rail before operators click into them.
 */
export const routeModules = {
  '/': () => import('@/pages/DashboardPage'),
  '/margin-gap': () => import('@/pages/MarginGapPage'),
  '/invoices': () => import('@/pages/InvoicesPage'),
  '/inventory': () => import('@/pages/InventoryPage'),
  '/reorder': () => import('@/pages/ReorderPage'),
  '/vendors': () => import('@/pages/VendorsPage'),
  '/supplier-opportunities': () => import('@/pages/SupplierOpportunitiesPage'),
  '/shrinkage': () => import('@/pages/ShrinkagePage'),
  '/alerts': () => import('@/pages/AlertsPage'),
} as const;

export type PrefetchableRoute = keyof typeof routeModules;

const prefetchedRoutes = new Set<PrefetchableRoute>();

export function prefetchRoute(route: PrefetchableRoute) {
  if (prefetchedRoutes.has(route)) return;
  prefetchedRoutes.add(route);
  void routeModules[route]();
}

export function prefetchCommonRoutes(routes: PrefetchableRoute[]) {
  routes.forEach(prefetchRoute);
}
