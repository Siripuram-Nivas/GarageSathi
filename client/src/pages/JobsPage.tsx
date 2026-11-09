import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { Job, JobStatus } from '../types';
import { NEXT_STATUS, formatDate, formatINR, statusLabel, statusTone } from '../lib/format';
import { PAGE_SIZE, filterJobs, paginate, sortJobs, type JobSortKey, type SortDirection } from '../lib/jobs';
import { useDebouncedValue } from '../lib/hooks';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  cn,
  useToast,
} from '../components/ui';

const STATUSES: JobStatus[] = [
  'RECEIVED',
  'INSPECTION',
  'AWAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<{ key: JobSortKey; direction: SortDirection }>({ key: 'created', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<JobStatus | ''>('');
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { push } = useToast();
  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    api
      .jobs()
      .then((res) => setJobs(res.jobs))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [debouncedQuery, status, sort.key, sort.direction]);

  const filtered = useMemo(
    () => (jobs ? sortJobs(filterJobs(jobs, debouncedQuery, status as JobStatus | ''), sort.key, sort.direction) : []),
    [jobs, debouncedQuery, status, sort],
  );
  const pageData = paginate(filtered, page);
  const selectedJobs = useMemo(() => (jobs ?? []).filter((job) => selected.has(job.jobId)), [jobs, selected]);
  const eligible = useMemo(
    () => (bulkStatus ? selectedJobs.filter((job) => NEXT_STATUS[job.currentStatus].includes(bulkStatus)) : []),
    [selectedJobs, bulkStatus],
  );

  function toggleSort(key: JobSortKey) {
    setSort((current) =>
      current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: key === 'created' ? 'desc' : 'asc' },
    );
  }

  function toggleRow(jobId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function togglePage() {
    const ids = pageData.items.map((job) => job.jobId);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function applyBulk() {
    if (!bulkStatus) return;
    setBulkBusy(true);
    try {
      const result = await api.bulkStatus(selectedJobs.map((job) => job.jobId), bulkStatus);
      const byId = new Map<string, Job>();
      for (const item of result.results) if (item.ok) byId.set(item.jobId, item.job);
      setJobs((current) => current?.map((job) => byId.get(job.jobId) ?? job) ?? null);
      if (result.updated) {
        push(
          result.failed
            ? `${result.updated} job card(s) moved to ${statusLabel(bulkStatus)}; ${result.failed} skipped (invalid transition or missing).`
            : `${result.updated} job card(s) moved to ${statusLabel(bulkStatus)}.`,
          result.failed ? 'info' : 'success',
        );
      } else {
        const firstFailure = result.results.find((item) => !item.ok);
        push(firstFailure && !firstFailure.ok ? firstFailure.message : 'No job cards were updated.', 'error');
      }
      setSelected(new Set());
      setBulkStatus('');
      setConfirmingBulk(false);
    } catch (e) {
      push((e as Error).message, 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-rose-300">{error}</p>
        <Button className="mt-4" onClick={() => location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!jobs) {
    return (
      <div>
        <PageHeader title="Job cards" subtitle="Loading saved job cards…" />
        <Card className="overflow-hidden p-4" aria-busy="true">
          <div className="mb-4 flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-44" />
          </div>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 border-t border-ink-700 py-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  const allOnPageSelected = pageData.items.length > 0 && pageData.items.every((job) => selected.has(job.jobId));

  return (
    <div>
      <PageHeader
        title="Job cards"
        subtitle={`${jobs.length} saved job cards. Search by job number, customer, vehicle or complaint.`}
        actions={
          <Link to="/new">
            <Button>
              <Plus size={16} /> New voice job
            </Button>
          </Link>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs…" className="pl-9" aria-label="Search job cards" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-44" aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </Select>
        <span className="text-xs text-slate-500" aria-live="polite">
          {filtered.length} shown
        </span>
      </Card>

      {selected.size > 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-3 border-teal-400/30 bg-teal-400/5 p-3">
          <span className="text-sm text-teal-100">{selected.size} selected</span>
          <Select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as JobStatus | '')}
            className="w-auto min-w-48"
            aria-label="Bulk status target"
          >
            <option value="">Move to…</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </Select>
          <Button disabled={!bulkStatus || !eligible.length} onClick={() => setConfirmingBulk(true)}>
            Apply to {eligible.length} eligible
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          {bulkStatus && eligible.length < selectedJobs.length && (
            <span className="text-xs text-amber-300">{selectedJobs.length - eligible.length} cannot move directly to this status.</span>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        {filtered.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={togglePage}
                        className="h-4 w-4 accent-teal-400"
                        aria-label="Select all job cards on this page"
                      />
                    </th>
                    <SortableHead label="Job" sortKey="jobId" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Customer" sortKey="customer" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 font-medium">Vehicle</th>
                    <th className="px-4 py-3 font-medium">Complaint</th>
                    <SortableHead label="Estimate" sortKey="estimate" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Created" sortKey="created" sort={sort} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700">
                  {pageData.items.map((job) => (
                    <tr key={job.id} className={cn('align-top transition hover:bg-ink-800/60', selected.has(job.jobId) && 'bg-teal-400/5')}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(job.jobId)}
                          onChange={() => toggleRow(job.jobId)}
                          className="h-4 w-4 accent-teal-400"
                          aria-label={`Select job ${job.jobId}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/jobs/${job.jobId}`} className="font-medium text-teal-300 hover:text-teal-200">
                          {job.jobId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{job.customerName || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {[job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || '—'}
                        {job.registrationNumber && <span className="block text-xs text-slate-500">{job.registrationNumber}</span>}
                      </td>
                      <td className="max-w-72 px-4 py-3 text-slate-400">
                        <span className="line-clamp-2">{job.customerComplaint || job.originalTranscript}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-200">{formatINR(job.estimateTotalPaise)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(job.currentStatus)}>{statusLabel(job.currentStatus)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 px-4 py-3">
              <span className="text-xs text-slate-500">
                Showing {(pageData.page - 1) * PAGE_SIZE + 1}–{Math.min(pageData.page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  disabled={pageData.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft size={14} /> Prev
                </Button>
                <span className="text-xs text-slate-400">
                  Page {pageData.page} of {pageData.pages}
                </span>
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  disabled={pageData.page >= pageData.pages}
                  onClick={() => setPage((current) => Math.min(pageData.pages, current + 1))}
                >
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title={jobs.length ? 'No jobs match your filters' : 'No job cards yet'}
            hint={jobs.length ? 'Try a different search or status.' : 'Record a Telugu complaint to create the first job card.'}
            action={
              jobs.length ? undefined : (
                <Link to="/new">
                  <Button variant="secondary">
                    <Plus size={16} /> New voice job
                  </Button>
                </Link>
              )
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={confirmingBulk}
        title="Update selected job cards?"
        confirmLabel={`Move ${eligible.length} job card(s)`}
        busy={bulkBusy}
        onConfirm={applyBulk}
        onClose={() => setConfirmingBulk(false)}
      >
        <p>
          Move <strong className="text-white">{eligible.length}</strong> of {selectedJobs.length} selected job card(s) to{' '}
          <strong className="text-white">{bulkStatus ? statusLabel(bulkStatus) : '—'}</strong>?
        </p>
        {eligible.length < selectedJobs.length && (
          <p className="mt-2 text-xs text-amber-300">
            {selectedJobs.length - eligible.length} job card(s) cannot move directly to that status and will be skipped.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">Each change is added to the job's status history.</p>
      </ConfirmDialog>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: JobSortKey;
  sort: { key: JobSortKey; direction: SortDirection };
  onSort: (key: JobSortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className="px-4 py-3 font-medium"
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex items-center gap-1 hover:text-slate-200', active && 'text-teal-300')}
      >
        {label}
        {active ? sort.direction === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-50" />}
      </button>
    </th>
  );
}
