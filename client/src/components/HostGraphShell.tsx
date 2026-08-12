/**
 * Review interface: compact procurement command rail matching the approved HostGraph visual direction.
 */
import { cn } from '@/lib/utils';
import { prefetchCommonRoutes, prefetchRoute, type PrefetchableRoute } from '@/lib/routePrefetch';
import {
  BadgeDollarSign,
  BellRing,
  Boxes,
  ChartNoAxesCombined,
  CircleHelp,
  FileChartColumnIncreasing,
  LayoutDashboard,
  Network,
  PackageSearch,
  ReceiptText,
  Settings,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

interface NavigationItem {
  label: string;
  icon: LucideIcon;
  to?: PrefetchableRoute;
  hint?: string;
}

const navItems: NavigationItem[] = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Margins', to: '/margin-gap', icon: ChartNoAxesCombined },
  { label: 'Orders', to: '/reorder', icon: ReceiptText },
  { label: 'Vendors', to: '/vendors', icon: Store },
  { label: 'Products', to: '/shrinkage', icon: Boxes },
  { label: 'Credits', icon: BadgeDollarSign, hint: 'Workspace preview' },
  { label: 'Alerts', to: '/alerts', icon: BellRing },
  { label: 'Reports', icon: FileChartColumnIncreasing, hint: 'Workspace preview' },
];

const utilityItems: NavigationItem[] = [
  { label: 'Settings', icon: Settings, hint: 'Workspace preview' },
  { label: 'Help', icon: CircleHelp, hint: 'Workspace preview' },
];

function NavigationRow({ item }: { item: NavigationItem }) {
  const Icon = item.icon;
  if (!item.to) {
    return (
      <div
        aria-disabled="true"
        className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-slate-500"
        title={item.hint}
      >
        <span className="flex size-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.025] text-slate-600">
          <Icon className="size-4" />
        </span>
        <span>{item.label}</span>
        <span className="ml-auto size-1.5 rounded-full bg-slate-700" />
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onPointerEnter={() => prefetchRoute(item.to!)}
      onFocus={() => prefetchRoute(item.to!)}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200',
          isActive
            ? 'border-violet-400/25 bg-gradient-to-r from-violet-500/18 to-cyan-400/8 text-white shadow-[0_0_34px_rgba(124,58,237,0.10)]'
            : 'border-transparent text-slate-400 hover:border-white/8 hover:bg-white/[0.035] hover:text-slate-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-lg border transition-colors',
              isActive
                ? 'border-violet-300/25 bg-violet-400/12 text-violet-100'
                : 'border-white/5 bg-white/[0.025] text-slate-500 group-hover:text-slate-200',
            )}
          >
            <Icon className="size-4" />
          </span>
          <span>{item.label}</span>
          {isActive ? <span className="ml-auto size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" /> : null}
        </>
      )}
    </NavLink>
  );
}

export function HostGraphShell() {
  useEffect(() => {
    prefetchCommonRoutes(['/margin-gap', '/alerts']);
  }, []);

  return (
    <div className="min-h-screen bg-[#060817] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(124,58,237,0.22),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#080b1d,#03050f_70%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative grid min-h-screen lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="border-r border-white/7 bg-[#070919]/90 px-4 py-5 backdrop-blur-2xl">
          <div className="flex h-full min-h-[calc(100vh-2.5rem)] flex-col">
            <div className="flex items-center gap-3 border-b border-white/7 px-2 pb-5">
              <span className="relative flex size-10 items-center justify-center rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/25 to-cyan-400/10 text-violet-100 shadow-[0_0_32px_rgba(124,58,237,0.16)]">
                <Network className="size-5" />
                <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-[#070919] bg-cyan-300" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-[0.16em] text-white">HOSTGRAPH</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-slate-500">Procurement command center</p>
              </div>
            </div>

            <nav className="mt-5 space-y-1" aria-label="Primary navigation">
              {navItems.map((item) => <NavigationRow key={item.label} item={item} />)}
            </nav>

            <div className="mt-auto space-y-1 border-t border-white/7 pt-4">
              {utilityItems.map((item) => <NavigationRow key={item.label} item={item} />)}
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/7 bg-white/[0.025] p-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold text-white">AM</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">Alex Morgan</p>
                  <p className="mt-1 truncate text-[10px] text-slate-500">Procurement Lead</p>
                </div>
                <PackageSearch className="ml-auto size-4 text-slate-600" />
              </div>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
