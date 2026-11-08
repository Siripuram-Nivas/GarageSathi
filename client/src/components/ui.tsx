import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react';

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonStyles: Record<Variant, string> = {
  primary: 'bg-teal-400 text-ink-950 hover:bg-teal-300 focus-visible:outline-teal-300 font-semibold',
  secondary: 'bg-ink-700 text-slate-100 hover:bg-ink-600 border border-ink-600',
  ghost: 'text-slate-300 hover:bg-ink-700 hover:text-white',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25',
};

export function Button({
  variant = 'primary',
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
        buttonStyles[variant],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-ink-700 bg-ink-850/80 shadow-lg shadow-black/10', className)}>{children}</div>;
}

type Tone = 'neutral' | 'teal' | 'amber' | 'sky' | 'green' | 'red';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-700 text-slate-300 border-ink-600',
  teal: 'bg-teal-400/10 text-teal-300 border-teal-400/30',
  amber: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  sky: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  green: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
  red: 'bg-rose-400/10 text-rose-300 border-rose-400/30',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-slate-500">{hint}</span>}
      {error && <span className="block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

const control =
  'w-full rounded-xl border border-ink-600 bg-ink-900/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/20';

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(control, props.className)} />
);

export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cn(control, 'min-h-24 resize-y', props.className)} />
);

export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cn(control, 'appearance-none', props.className)} />
);

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 p-8 text-sm text-slate-400">
      <Loader2 size={18} className="animate-spin text-teal-300" /> {label}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="rounded-2xl border border-ink-600 bg-ink-800 p-3 text-slate-400">
        <Inbox size={22} />
      </div>
      <div>
        <p className="font-medium text-slate-200">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{hint}</p>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ── Toasts ─────────────────────────────────────────────────────────────── */

type Toast = { id: number; message: string; kind: 'success' | 'error' | 'info' };
const ToastContext = createContext<{ push: (message: string, kind?: Toast['kind']) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border p-3 text-sm shadow-xl backdrop-blur',
              toast.kind === 'error'
                ? 'border-rose-500/40 bg-rose-950/90 text-rose-100'
                : toast.kind === 'success'
                  ? 'border-teal-400/40 bg-teal-950/90 text-teal-100'
                  : 'border-ink-600 bg-ink-800/95 text-slate-200',
            )}
          >
            {toast.kind === 'error' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} className="opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ── Modal ──────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink-600 bg-ink-850 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-ink-700 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="text-sm text-slate-300">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
