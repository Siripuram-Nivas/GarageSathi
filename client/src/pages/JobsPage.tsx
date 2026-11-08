import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { Job, JobStatus } from '../types';
import { formatDate, formatINR, statusLabel, statusTone } from '../lib/format';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from '../components/ui';

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

  useEffect(() => {
    api
      .jobs()
      .then((res) => setJobs(res.jobs))
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const needle = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (status && job.currentStatus !== status) return false;
      if (!needle) return true;
      return [job.jobId, job.customerName, job.vehicleMake, job.vehicleModel, job.customerComplaint, job.registrationNumber]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [jobs, query, status]);

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
  if (!jobs) return <Spinner label="Loading job cards…" />;

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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs…" className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-44">
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </Select>
        <span className="text-xs text-slate-500">{filtered.length} shown</span>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Complaint</th>
                  <th className="px-4 py-3 font-medium">Estimate</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {filtered.map((job) => (
                  <tr key={job.id} className="align-top transition hover:bg-ink-800/60">
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
                    <td className="px-4 py-3 text-slate-200">{formatINR(job.estimateTotalPaise)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(job.currentStatus)}>{statusLabel(job.currentStatus)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(job.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
