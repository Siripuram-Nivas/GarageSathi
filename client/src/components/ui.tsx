import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react';

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonStyles: Record<Variant, string> = {
  primary: 'bg-marigold text-deep-aubergine hover:bg-amber-500 focus-visible:outline-deep-aubergine font-semibold',
  secondary: 'bg-deep-aubergine text-white hover:bg-deep-aubergine/90 border border-deep-aubergine',
  ghost: 'text-deep-aubergine hover:bg-ice-silver hover:text-deep-aubergine',
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

export function Card({
  className,
  children,
  ...props
}: { className?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass-panel rounded-2xl', className)} {...props}>
      {children}
    </div>
  );
}

type Tone = 'neutral' | 'aubergine' | 'marigold' | 'sky' | 'green' | 'red';

const tones: Record<Tone, string> = {
  neutral: 'bg-ice-silver text-deep-aubergine border-border',
  aubergine: 'bg-deep-aubergine/10 text-deep-aubergine border-deep-aubergine/30',
  marigold: 'bg-marigold/10 text-marigold border-marigold/30',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
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
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs text-rose-600">
          {error}
        </span>
      )}
    </label>
  );
}

const control =
  'w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-deep-aubergine placeholder:text-muted focus:border-deep-aubergine focus:outline-none focus:ring-2 focus:ring-deep-aubergine/20';

const invalidControl = 'border-rose-500/60 focus:border-rose-400/60 focus:ring-rose-400/20';

export const Input = ({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => (
  <input {...props} aria-invalid={invalid || undefined} className={cn(control, invalid && invalidControl, className)} />
);

export const Textarea = ({ invalid, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => (
  <textarea {...props} aria-invalid={invalid || undefined} className={cn(control, 'min-h-24 resize-y', invalid && invalidControl, className)} />
);

export const Select = ({ invalid, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) => (
  <select {...props} aria-invalid={invalid || undefined} className={cn(control, 'appearance-none', invalid && invalidControl, className)} />
);

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('glass-skeleton rounded-lg', className)} />;
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 p-8 text-sm text-muted">
      <Loader2 size={18} className="animate-spin text-deep-aubergine" /> {label}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="rounded-2xl border border-border bg-white p-3 text-muted">
        <Inbox size={22} />
      </div>
      <div>
        <p className="font-medium text-deep-aubergine">{title}</p>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-deep-aubergine font-serif">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
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
              'glass-toast pointer-events-auto flex items-start gap-2 rounded-xl border p-3 text-sm',
              toast.kind === 'error'
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : toast.kind === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-border bg-white text-deep-aubergine',
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
  dismissOnBackdrop = true,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  dismissOnBackdrop?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('[data-autofocus], button, input, select, textarea, a[href]')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-deep-aubergine/35 p-4 backdrop-blur-sm"
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-dialog w-full max-w-md rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-deep-aubergine font-serif">
            {title}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-ice-silver hover:text-deep-aubergine" aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>
        <div className="text-sm text-muted">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Confirmation for destructive or hard-to-undo actions. Backdrop clicks do not dismiss it. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}