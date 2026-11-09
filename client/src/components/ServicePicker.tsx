import { useMemo, useState, type KeyboardEvent } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import type { Service } from '../types';
import { filterCatalogue } from '../lib/catalogue';
import { formatINR } from '../lib/format';
import { Badge, cn } from './ui';

export function ServicePicker({
  services,
  loading,
  error,
  selectedIds,
  onAdd,
}: {
  services: Service[];
  loading: boolean;
  error: string;
  selectedIds: Set<string>;
  onAdd: (service: Service) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => filterCatalogue(services, query), [services, query]);

  function add(service: Service) {
    onAdd(service);
    setActive(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const service = results[active];
      if (service && open) add(service);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls="service-picker-list"
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `service-option-${results[active].id}` : undefined}
          aria-label="Find a service to add"
          placeholder="Find a service… (English or Telugu)"
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-deep-aubergine placeholder:text-muted focus:border-deep-aubergine focus:outline-none focus:ring-2 focus:ring-deep-aubergine/20"
        />
      </div>

      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {selectedIds.size} service{selectedIds.size === 1 ? '' : 's'} selected · tap to add, or drag a row into the estimate.
      </p>

      {open && (
        <ul id="service-picker-list" role="listbox" aria-label="Catalogue services" className="glass-popover mt-2 max-h-72 overflow-y-auto rounded-xl p-1 scrollbar-thin">
          {loading && <li className="px-3 py-3 text-sm text-muted">Loading services…</li>}
          {!loading && error && (
            <li className="px-3 py-3 text-sm text-rose-600" role="alert">
              {error}
            </li>
          )}
          {!loading && !error && !services.length && <li className="px-3 py-3 text-sm text-muted">No services are available yet.</li>}
          {!loading && !error && services.length > 0 && !results.length && (
            <li className="px-3 py-3 text-sm text-muted">No services match "{query}". Try an English or Telugu word.</li>
          )}
          {!loading &&
            !error &&
            results.map((service, index) => {
              const added = selectedIds.has(service.id);
              return (
                <li
                  key={service.id}
                  id={`service-option-${service.id}`}
                  role="option"
                  aria-selected={index === active}
                  draggable={!added}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-garagesathi-service', service.id);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => !added && add(service)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm',
                    index === active ? 'bg-marigold/10' : 'hover:bg-ice-silver',
                    added ? 'cursor-default text-muted' : 'text-deep-aubergine',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{service.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {service.category} · {service.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">{formatINR(service.pricePaise)}</span>
                  {added ? <Badge tone="aubergine"><Check size={12} /> Added</Badge> : <Plus size={16} className="shrink-0 text-marigold" />}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}