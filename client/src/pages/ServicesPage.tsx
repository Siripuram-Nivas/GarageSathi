import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Save } from 'lucide-react';
import { api } from '../lib/api';
import type { Service } from '../types';
import { formatINR } from '../lib/format';
import { Badge, Button, Card, Field, Input, PageHeader, Skeleton, useToast } from '../components/ui';

type Draft = { rupees: string; isActive: boolean };

const priceError = (rupees: string) => {
  const value = Number(rupees);
  if (!rupees.trim() || !Number.isFinite(value) || value < 0) return 'Enter a price of 0 or more.';
  return '';
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({ name: '', rupees: '', category: 'General', aliases: '' });
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const { push } = useToast();

  const load = () => {
    api
      .services()
      .then((res) => {
        setServices(res.services);
        setDrafts(Object.fromEntries(res.services.map((s) => [s.id, { rupees: String(s.pricePaise / 100), isActive: s.isActive }])));
      })
      .catch((e) => push(e.message, 'error'));
  };

  useEffect(load, []);

  if (!services) {
    return (
      <div>
        <PageHeader title="Service catalogue" subtitle="Loading catalogue…" />
        <Card className="overflow-hidden p-4" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 border-t border-ink-700 py-4 first:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  async function save(service: Service) {
    const draft = drafts[service.id];
    const error = priceError(draft?.rupees ?? '');
    if (error) {
      push(error, 'error');
      return;
    }
    const rupees = Number(draft.rupees);
    setSavingId(service.id);
    try {
      const { service: updated } = await api.updateService(service.id, {
        pricePaise: Math.round(rupees * 100),
        isActive: draft.isActive,
      });
      setServices((current) => current?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
      push(`${updated.name} updated. Existing job cards keep their snapshot price.`, 'success');
    } catch (e) {
      push((e as Error).message, 'error');
    } finally {
      setSavingId('');
    }
  }

  async function addService() {
    const error =
      newService.name.trim().length < 2 ? 'Enter a service name of at least 2 characters.' : priceError(newService.rupees);
    if (error) {
      setAddError(error);
      return;
    }
    const rupees = Number(newService.rupees);
    setAddError('');
    setAdding(true);
    try {
      const { service } = await api.createService({
        name: newService.name.trim(),
        pricePaise: Math.round(rupees * 100),
        category: newService.category || 'General',
        aliases: newService.aliases
          .split(',')
          .map((alias) => alias.trim())
          .filter(Boolean),
        description: '',
        isActive: true,
      });
      setNewService({ name: '', rupees: '', category: 'General', aliases: '' });
      setShowAdd(false);
      load();
      push(`${service.name} added to the catalogue.`, 'success');
    } catch (e) {
      push((e as Error).message, 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Service catalogue"
        subtitle="The only source of prices. Estimates always read from here on the server."
        actions={
          <Button onClick={() => setShowAdd((value) => !value)}>
            <Plus size={16} /> Add service
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        <p>These are demonstration prices, not verified market rates. Confirm real prices before any production use.</p>
      </div>

      {showAdd && (
        <Card className="mb-4 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-200">New catalogue service</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name">
              <Input
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                invalid={Boolean(addError) && newService.name.trim().length < 2}
                placeholder="Air Filter Replacement"
              />
            </Field>
            <Field label="Price (₹)">
              <Input
                type="number"
                min={0}
                value={newService.rupees}
                onChange={(e) => setNewService({ ...newService, rupees: e.target.value })}
                invalid={Boolean(addError) && Boolean(priceError(newService.rupees))}
                placeholder="250"
              />
            </Field>
            <Field label="Category">
              <Input value={newService.category} onChange={(e) => setNewService({ ...newService, category: e.target.value })} />
            </Field>
            <Field label="Aliases (comma separated)" hint="Include Telugu words for recognition.">
              <Input value={newService.aliases} onChange={(e) => setNewService({ ...newService, aliases: e.target.value })} placeholder="air filter, ఎయిర్ ఫిల్టర్" />
            </Field>
          </div>
          {addError && (
            <p role="alert" className="mt-2 text-xs text-rose-400">
              {addError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button onClick={addService} loading={adding}>
              Save service
            </Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Aliases</th>
                <th className="px-4 py-3 font-medium">Price (₹)</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Snapshot</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {services.map((service) => {
                const draft = drafts[service.id] ?? { rupees: String(service.pricePaise / 100), isActive: service.isActive };
                return (
                  <tr key={service.id} className="align-middle">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{service.name}</p>
                      <p className="text-xs text-slate-500">{service.category}</p>
                    </td>
                    <td className="max-w-64 px-4 py-3 text-xs text-slate-400">{service.aliases.join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min={0}
                        value={draft.rupees}
                        onChange={(e) => setDrafts({ ...drafts, [service.id]: { ...draft, rupees: e.target.value } })}
                        className="w-28"
                        aria-label={`Price for ${service.name}`}
                        invalid={Boolean(priceError(draft.rupees))}
                      />
                      {priceError(draft.rupees) && (
                        <p role="alert" className="mt-1 text-xs text-rose-400">
                          {priceError(draft.rupees)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(e) => setDrafts({ ...drafts, [service.id]: { ...draft, isActive: e.target.checked } })}
                          className="h-4 w-4 accent-teal-400"
                        />
                        {draft.isActive ? 'Active' : 'Inactive'}
                      </label>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatINR(service.pricePaise)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                        loading={savingId === service.id}
                        disabled={draft.rupees === String(service.pricePaise / 100) && draft.isActive === service.isActive}
                        onClick={() => save(service)}
                      >
                        <Save size={14} /> Save
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        <Badge>Tip</Badge> Every saved job card keeps a price snapshot, so changing the catalogue never rewrites history.
      </p>
    </div>
  );
}
