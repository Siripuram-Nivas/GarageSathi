import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Pencil, RotateCcw, Search, Save, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Service } from '../types';
import { formatINR } from '../lib/format';
import { catalogueCategories, filterCatalogue, parseRupees } from '../lib/catalogue';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton, useToast } from '../components/ui';

const errorText = (error: unknown) => (error as Error).message;

export default function ServicesPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editingId, setEditingId] = useState('');
  const [priceDraft, setPriceDraft] = useState('');
  const [priceError, setPriceError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [savedId, setSavedId] = useState('');
  const { push } = useToast();

  function load() {
    setLoadError('');
    api
      .services()
      .then((res) => setServices(res.services))
      .catch((error) => setLoadError(errorText(error)));
  }

  useEffect(load, []);

  function startEdit(service: Service) {
    setEditingId(service.id);
    setPriceDraft(String(service.pricePaise / 100));
    setPriceError('');
    setSavedId('');
  }

  function cancelEdit() {
    setEditingId('');
    setPriceDraft('');
    setPriceError('');
  }

  async function savePrice(service: Service) {
    const parsed = parseRupees(priceDraft);
    if ('error' in parsed) {
      setPriceError(parsed.error);
      return;
    }
    setPriceError('');
    setSavingId(service.id);
    try {
      const { service: updated } = await api.updateServicePrice(service.id, parsed.pricePaise);
      setServices((current) => current?.map((item) => (item.id === updated.id ? updated : item)) ?? null);
      setEditingId('');
      setSavedId(updated.id);
      push(`${updated.name} price updated for this garage. Existing job cards keep their snapshot.`, 'success');
    } catch (error) {
      setPriceError(errorText(error));
    } finally {
      setSavingId('');
    }
  }

  if (!services) {
    return (
      <div>
        <PageHeader title="Service Catalogue" subtitle="Choose from ready-made services. Adjust your garage prices whenever needed." />
        {loadError ? (
          <Card className="p-6">
            <p role="alert" className="text-sm text-rose-600">
              The catalogue could not be loaded: {loadError}
            </p>
            <Button variant="secondary" className="mt-3" onClick={load}>
              <RotateCcw size={16} /> Try again
            </Button>
          </Card>
        ) : (
          <Card className="p-4" aria-busy="true">
            <p className="pb-3 text-sm text-muted">Loading services…</p>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="mb-2 h-16 w-full" />
            ))}
          </Card>
        )}
      </div>
    );
  }

  const categories = catalogueCategories(services);
  const results = filterCatalogue(services, query, category);

  return (
    <div>
      <PageHeader title="Service Catalogue" subtitle="Choose from ready-made services. Adjust your garage prices whenever needed." />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-marigold/30 bg-marigold/5 p-3 text-sm text-marigold">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        <p>These are demonstration prices, not verified market rates. Confirm real prices before any production use.</p>
      </div>

      <Card className="glass-toolbar mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <Field label="Find a service">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search in English or Telugu…"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {results.length} of {services.length} services
        </p>
      </Card>

      {!services.length ? (
        <Card>
          <EmptyState title="No services available" hint="The platform catalogue has not been seeded yet. Contact your GarageSathi administrator." />
        </Card>
      ) : !results.length ? (
        <Card>
          <EmptyState
            title="No services match your search"
            hint="Try an English or Telugu word, or clear the category filter."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setCategory('');
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((service) => {
            const editing = editingId === service.id;
            return (
              <li key={service.id}>
                <Card className="glass-card-interactive flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-medium text-deep-aubergine">{service.name}</h2>
                      <Badge className="mt-1">{service.category}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted">{service.description}</p>

                  {editing ? (
                    <div className="mt-3 space-y-2">
                      <Field label="Garage price (₹)" error={priceError}>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={priceDraft}
                          onChange={(event) => {
                            setPriceDraft(event.target.value);
                            setPriceError('');
                          }}
                          invalid={Boolean(priceError)}
                          autoFocus
                          aria-label={`Garage price for ${service.name} in rupees`}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Button className="px-3 py-1.5 text-xs" loading={savingId === service.id} onClick={() => savePrice(service)}>
                          <Save size={14} /> Save price
                        </Button>
                        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={cancelEdit} disabled={savingId === service.id}>
                          <X size={14} /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-wide text-muted">Garage price</p>
                      <p className="text-lg font-semibold tabular-nums text-deep-aubergine">{formatINR(service.pricePaise)}</p>
                      <p className="text-xs text-muted">
                        {service.priceOverridden
                          ? `Catalogue default ${formatINR(service.defaultPricePaise)}`
                          : 'Using the catalogue default price'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => startEdit(service)}>
                          <Pencil size={14} /> Edit price
                        </Button>
                        {savedId === service.id && (
                          <span role="status" className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 size={14} /> Price updated
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted">
        Changing a garage price never changes the central default, and every saved job card keeps the price snapshot taken at approval.
      </p>
    </div>
  );
}