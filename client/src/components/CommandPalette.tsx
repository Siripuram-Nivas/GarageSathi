import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { COMMANDS, filterCommands } from '../lib/commands';
import { cn } from './ui';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const results = useMemo(() => filterCommands(COMMANDS, query), [query]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActive(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`command-${results[active]?.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, results]);

  if (!open) return null;

  const run = (to: string) => {
    onClose();
    navigate(to);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const command = results[active];
      if (command) run(command.to);
    } else if (event.key === 'Tab') {
      event.preventDefault();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-ink-600 bg-ink-850 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-3">
          <Search size={16} className="text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page or action…"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={results[active] ? `command-${results[active].id}` : undefined}
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="rounded border border-ink-600 px-1.5 py-0.5 text-[10px] text-slate-500">esc</kbd>
        </div>

        <ul id="command-list" role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          {results.map((command, index) => (
            <li
              key={command.id}
              id={`command-${command.id}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => run(command.to)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
                index === active ? 'bg-teal-400/10 text-teal-100' : 'text-slate-300 hover:bg-ink-800',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{command.label}</span>
                <span className="block truncate text-xs text-slate-500">{command.hint}</span>
              </span>
              {command.keys && (
                <kbd className="rounded border border-ink-600 px-1.5 py-0.5 text-[10px] text-slate-500">{command.keys}</kbd>
              )}
            </li>
          ))}
          {!results.length && <li className="px-3 py-4 text-sm text-slate-400">No matches.</li>}
        </ul>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-700 px-4 py-2 text-[11px] text-slate-500">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
