import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { usePersistentState } from '../lib/hooks';
import { CommandPalette } from './CommandPalette';
import { Badge, Button, cn } from './ui';

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

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return (
    !!element &&
    (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT' || element.isContentEditable)
  );
};

export function Layout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = usePersistentState('garagesathi.sidebarCollapsed', false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mode, setMode] = useState<'mock' | 'live' | 'offline'>('offline');
  const [dbMode, setDbMode] = useState<'mongodb' | 'file' | null>(null);
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [garage, setGarage] = useState<GarageIdentity>(readGarage);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    api
      .health()
      .then((health) => {
        setMode(health.ai.mode);
        setDbMode(health.db.mode);
      })
      .catch(() => setMode('offline'));
  }, []);

  useEffect(() => {
    api.auth
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch {
      /* ignore logout errors */
    }
    setUser(null);
    navigate('/login');
  }

  useEffect(() => setGarage(readGarage()), [location.pathname]);
  useEffect(() => {
    const sync = () => setGarage(readGarage());
    window.addEventListener('garage-identity', sync);
    return () => window.removeEventListener('garage-identity', sync);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  // Mobile drawer: Escape closes and returns focus to the menu button.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);

  // Global shortcuts: Ctrl/Cmd+K or ? opens the palette, n starts a job, g+d/j/s navigates.
  useEffect(() => {
    let pendingG = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;

      if (event.key === '?') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        navigate('/new');
        return;
      }
      if (pendingG) {
        pendingG = false;
        if (timer) clearTimeout(timer);
        const routes: Record<string, string> = { d: '/', j: '/jobs', s: '/services', a: '/ai' };
        const to = routes[event.key.toLowerCase()];
        if (to) {
          event.preventDefault();
          navigate(to);
        }
        return;
      }
      if (event.key.toLowerCase() === 'g') {
        pendingG = true;
        timer = setTimeout(() => {
          pendingG = false;
        }, 800);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [navigate]);

  const hideWhenCollapsed = collapsed && 'lg:hidden';

  return (
    <div className="min-h-screen bg-ink-900">
      <aside
        id="app-sidebar"
        ref={drawerRef}
        tabIndex={-1}
        aria-label="Primary"
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex-col border-r border-ink-700 bg-ink-950 outline-none transition-[width] duration-200 lg:flex',
          open ? 'flex' : 'hidden',
          collapsed ? 'w-64 lg:w-[4.75rem]' : 'w-64',
        )}
      >
        <div className={cn('flex items-center gap-3 px-5 py-5', collapsed && 'lg:flex-col lg:gap-2 lg:px-2 lg:py-3')}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-400 font-bold text-ink-950">GS</div>
          <div className={cn('min-w-0', hideWhenCollapsed)}>
            <p className="truncate font-semibold text-white">GarageSathi</p>
            <p className="truncate text-xs text-slate-400">Voice-powered garage ops</p>
          </div>
          <button
            className={cn(
              'ml-auto hidden rounded-lg p-1 text-slate-400 hover:bg-ink-800 hover:text-white lg:inline-flex',
              collapsed && 'lg:ml-0',
            )}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-ink-800 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  collapsed && 'lg:justify-center lg:px-0',
                  isActive ? 'bg-teal-400/10 font-medium text-teal-200' : 'text-slate-400 hover:bg-ink-800 hover:text-slate-100',
                )
              }
            >
              <Icon size={17} className="shrink-0" />
              <span className={cn('truncate', hideWhenCollapsed)}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-ink-700 p-4">
          <button
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl border border-ink-700 px-3 py-2 text-xs text-slate-400 hover:bg-ink-800 hover:text-slate-200',
              collapsed && 'lg:justify-center lg:px-0',
            )}
            aria-label="Open command palette"
          >
            <Search size={14} />
            <span className={cn('flex-1 text-left', hideWhenCollapsed)}>Jump to…</span>
            <kbd className={cn('rounded border border-ink-600 px-1 py-0.5 text-[10px]', hideWhenCollapsed)}>Ctrl K</kbd>
          </button>
          <div className={cn('space-y-2', collapsed && 'lg:hidden')}>
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
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-700 bg-ink-900/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            ref={menuButtonRef}
            onClick={() => setOpen(true)}
            className="rounded-lg border border-ink-600 p-2 text-slate-300"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="app-sidebar"
          >
            <Menu size={18} />
          </button>
          <span className="font-semibold text-white">GarageSathi</span>
          <span className="ml-auto flex items-center gap-2">
            {!authChecked ? null : user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">@{user.username}</span>
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut size={14} /> Sign out
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="secondary">
                  <LogIn size={14} /> Sign in
                </Button>
              </Link>
            )}
            {mode === 'live' ? <Badge tone="teal">LIVE</Badge> : mode === 'mock' ? <Badge tone="amber">MOCK</Badge> : <Badge tone="red">OFFLINE</Badge>}
          </span>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
