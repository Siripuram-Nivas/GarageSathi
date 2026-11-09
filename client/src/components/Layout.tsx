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
  Wrench,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { usePersistentState } from '../lib/hooks';
import { CommandPalette } from './CommandPalette';
import { Badge, Button, cn } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/new', label: 'New Job', icon: Mic },
  { to: '/jobs', label: 'Job Cards', icon: ClipboardList },
  { to: '/services', label: 'Service Catalogue', icon: Wrench },
  { to: '/settings', label: 'Garage Settings', icon: Settings },
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
  const [offline, setOffline] = useState(false);
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
      .then(() => setOffline(false))
      .catch(() => setOffline(true));
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
        const routes: Record<string, string> = { d: '/', j: '/jobs', s: '/services' };
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
    <div className="app-canvas min-h-screen">
      <aside
        id="app-sidebar"
        ref={drawerRef}
        tabIndex={-1}
        aria-label="Primary"
        className={cn(
          'glass-nav fixed inset-y-0 left-0 z-30 flex-col border-r outline-none transition-[width] duration-200 lg:flex',
          open ? 'flex' : 'hidden',
          collapsed ? 'w-64 lg:w-[4.75rem]' : 'w-64',
        )}
      >
        <div className={cn('flex items-center gap-3 px-5 py-5', collapsed && 'lg:flex-col lg:gap-2 lg:px-2 lg:py-3')}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-marigold font-bold text-deep-aubergine">GS</div>
          <div className={cn('min-w-0', hideWhenCollapsed)}>
            <p className="truncate font-semibold text-white">GarageSathi</p>
            <p className="truncate text-xs text-white/60">Voice-powered garage ops</p>
          </div>
          <button
            className={cn(
              'ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-0 text-white/70 hover:bg-white/10 hover:text-white',
              collapsed && 'lg:ml-0',
            )}
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
            title="Commands (Ctrl K)"
          >
            <Search size={17} />
          </button>
          <button
            className={cn(
              'hidden rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white lg:inline-flex',
              collapsed && 'lg:ml-0',
            )}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
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
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  collapsed && 'lg:justify-center lg:px-0',
                  isActive
                    ? 'bg-marigold text-deep-aubergine'
                    : 'text-white hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon size={17} className="shrink-0" />
              <span className={cn('truncate', hideWhenCollapsed)}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={cn('border-t border-white/10 p-4', collapsed && 'lg:hidden')}>
          <p className="text-xs text-white/50">Garage</p>
          <p className="truncate text-sm font-medium text-white">{garage.name}</p>
          {offline && (
            <p className="mt-2">
              <Badge tone="red">API offline</Badge>
            </p>
          )}
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-64')}>
        <header className="glass-toolbar sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 backdrop-blur lg:hidden">
          <button
            ref={menuButtonRef}
            onClick={() => setOpen(true)}
            className="rounded-lg border border-border p-2 text-deep-aubergine"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="app-sidebar"
          >
            <Menu size={18} />
          </button>
          <span className="font-semibold text-deep-aubergine">GarageSathi</span>
          <span className="ml-auto flex items-center gap-2">
            {!authChecked ? null : user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">@{user.username}</span>
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
            {offline && <Badge tone="red">Offline</Badge>}
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
