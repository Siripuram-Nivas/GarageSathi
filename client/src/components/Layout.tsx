import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, Menu, Mic, Settings, Sparkles, Wrench, X } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, cn } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/new', label: 'New Voice Job', icon: Mic },
  { to: '/jobs', label: 'Job Cards', icon: ClipboardList },
  { to: '/services', label: 'Service Catalogue', icon: Wrench },
  { to: '/settings', label: 'Garage Settings', icon: Settings },
  { to: '/ai', label: 'AI Integration', icon: Sparkles },
];

export interface GarageIdentity {
  name: string;
  owner: string;
  phone: string;
}

export const readGarage = (): GarageIdentity => {
  try {
    const saved = localStorage.getItem('garage.identity');
    if (saved) return JSON.parse(saved) as GarageIdentity;
  } catch {
    /* ignore corrupt local data */
  }
  return { name: 'Sri Balaji Auto Works', owner: 'Ravi', phone: '+91 90000 00000' };
};

export function Layout() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'mock' | 'live' | 'offline'>('offline');
  const [dbMode, setDbMode] = useState<'mongodb' | 'file' | null>(null);
  const location = useLocation();
  const [garage, setGarage] = useState<GarageIdentity>(readGarage);

  useEffect(() => {
    api
      .health()
      .then((health) => {
        setMode(health.ai.mode);
        setDbMode(health.db.mode);
      })
      .catch(() => setMode('offline'));
  }, []);

  useEffect(() => setGarage(readGarage()), [location.pathname]);
  useEffect(() => {
    const sync = () => setGarage(readGarage());
    window.addEventListener('garage-identity', sync);
    return () => window.removeEventListener('garage-identity', sync);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-ink-900">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-ink-700 bg-ink-950 lg:flex',
          open ? 'flex' : 'hidden',
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-400 font-bold text-ink-950">GS</div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">GarageSathi</p>
            <p className="truncate text-xs text-slate-400">Voice-powered garage ops</p>
          </div>
          <button className="ml-auto text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  isActive ? 'bg-teal-400/10 font-medium text-teal-200' : 'text-slate-400 hover:bg-ink-800 hover:text-slate-100',
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-ink-700 p-4">
          <div>
            <p className="text-xs text-slate-500">Garage</p>
            <p className="truncate text-sm font-medium text-slate-200">{garage.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === 'offline' ? (
              <Badge tone="red">API OFFLINE</Badge>
            ) : mode === 'live' ? (
              <Badge tone="teal">LIVE GNANI AI MODE</Badge>
            ) : (
              <Badge tone="amber">MOCK MODE</Badge>
            )}
            {dbMode && <Badge>{dbMode === 'mongodb' ? 'MongoDB' : 'Local store'}</Badge>}
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-700 bg-ink-900/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg border border-ink-600 p-2 text-slate-300" aria-label="Open menu">
            <Menu size={18} />
          </button>
          <span className="font-semibold text-white">GarageSathi</span>
          <span className="ml-auto">
            {mode === 'live' ? <Badge tone="teal">LIVE</Badge> : mode === 'mock' ? <Badge tone="amber">MOCK</Badge> : <Badge tone="red">OFFLINE</Badge>}
          </span>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
