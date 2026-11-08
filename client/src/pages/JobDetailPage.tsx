import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, Wrench } from 'lucide-react';
import { api } from '../lib/api';
import type { Job, JobStatus } from '../types';
import { NEXT_STATUS, formatDate, formatINR, statusLabel, statusTone } from '../lib/format';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, useToast } from '../components/ui';
import { SpeakButton } from '../components/SpeakButton';

export default function JobDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [nextStatus, setNextStatus] = useState<JobStatus | ''>('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .job(id)
      .then((res) => setJob(res.job))
      .catch((e) => setError(e.message));
  }, [id]);

  async function applyStatus() {
    if (!job || !nextStatus) return;
    setSaving(true);
    try {
      const { job: updated } = await api.updateStatus(job.jobId, nextStatus, note || undefined);
      setJob(updated);
      setNextStatus('');
      setNote('');
      setConfirming(false);
      push(`Status updated to ${statusLabel(updated.currentStatus)}.`, 'success');
    } catch (e) {
      push((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-rose-300">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/jobs')}>
          Back to job cards
        </Button>
      </Card>
    );
  }
  if (!job) return <Spinner label="Loading job card…" />;

  const allowed = NEXT_STATUS[job.currentStatus];

  return (
    <div>
      <PageHeader
        title={`Job ${job.jobId}`}
        subtitle={`Created ${formatDate(job.createdAt)} · ${job.aiMode === 'live' ? 'Live Gnani' : 'Mock'} intake`}
        actions={
          <Link to="/jobs">
            <Button variant="secondary">
              <ArrowLeft size={16} /> All jobs
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(job.currentStatus)}>{statusLabel(job.currentStatus)}</Badge>
              <Badge tone={job.approvalStatus === 'APPROVED' ? 'teal' : 'amber'}>{job.approvalStatus === 'APPROVED' ? 'Estimate approved' : 'Awaiting approval'}</Badge>
              {job.aiMode === 'mock' && <Badge tone="amber">MOCK INTAKE</Badge>}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Customer" value={job.customerName || '—'} />
              <Info label="Phone" value={job.customerPhone || '—'} />
              <Info label="Vehicle" value={[job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || '—'} />
              <Info label="Registration" value={job.registrationNumber || '—'} />
              <Info label="Detected language" value={job.detectedLanguage} />
              <Info label="Approved at" value={job.approvedAt ? formatDate(job.approvedAt) : '—'} />
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Customer-reported complaint</p>
              <p className="mt-1 rounded-xl border border-ink-600 bg-ink-900/50 p-3 text-sm text-slate-300">{job.customerComplaint || '—'}</p>
              <p className="mt-1 text-xs text-slate-500">Not a mechanical diagnosis. Final findings belong in mechanic notes after inspection.</p>
            </div>

            {job.symptoms.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {job.symptoms.map((symptom) => (
                  <Badge key={symptom} tone="sky">
                    {symptom}
                  </Badge>
                ))}
              </div>
            )}

            {job.unresolvedItems.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">
                <p className="font-medium text-amber-300">Unresolved service terms</p>
                <ul className="mt-1 list-inside list-disc">
                  {job.unresolvedItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {job.mechanicNotes && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Mechanic notes</p>
                <p className="mt-1 text-sm text-slate-300">{job.mechanicNotes}</p>
              </div>
            )}

            <details className="mt-5 rounded-xl border border-ink-600 p-3">
              <summary className="cursor-pointer text-sm text-slate-400">Original transcript (preserved)</summary>
              <p className="mt-2 text-sm text-slate-300">{job.originalTranscript}</p>
            </details>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-ink-700 px-4 py-3">
              <h2 className="flex items-center gap-2 font-medium text-slate-200">
                <Wrench size={16} /> Service estimate
              </h2>
              <p className="text-xs text-slate-500">Prices are a snapshot of the catalogue at approval time.</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-4 py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {job.serviceItems.map((item) => (
                  <tr key={item.serviceId}>
                    <td className="px-4 py-2.5 text-slate-200">{item.serviceName}</td>
                    <td className="px-4 py-2.5 text-slate-400">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-slate-400">{formatINR(item.unitPricePaise)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-200">{formatINR(item.lineTotalPaise)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink-600">
                  <td colSpan={3} className="px-4 py-3 text-right text-slate-400">
                    Estimated total
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-semibold text-teal-300">{formatINR(job.estimateTotalPaise)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-medium text-slate-200">Telugu confirmation</h2>
            <p className="mt-1 text-xs text-slate-500">Job number and amount are spoken in Telugu words.</p>
            <div className="mt-3">
              <SpeakButton jobId={job.jobId} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-medium text-slate-200">Update status</h2>
            {allowed.length ? (
              <div className="mt-3 space-y-3">
                <Field label="Move to">
                  <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as JobStatus)}>
                    <option value="">Choose next status…</option>
                    {allowed.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Note (optional)">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Brake pads replaced" />
                </Field>
                <Button className="w-full" disabled={!nextStatus} onClick={() => setConfirming(true)}>
                  Update status
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">This job is in a final state. No further transitions are allowed.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Clock3 size={15} /> Status history
            </h2>
            <ol className="mt-3 space-y-3">
              {job.statusHistory.map((event, index) => (
                <li key={`${event.status}-${index}`} className="relative border-l border-ink-600 pl-4">
                  <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-ink-850 bg-teal-400" />
                  <p className="text-sm text-slate-200">{statusLabel(event.status)}</p>
                  <p className="text-xs text-slate-500">{formatDate(event.at)}</p>
                  {event.note && <p className="mt-0.5 text-xs text-slate-400">{event.note}</p>}
                </li>
              ))}
            </ol>
            {!job.statusHistory.length && <EmptyState title="No history" hint="Status changes will appear here." />}
          </Card>
        </div>
      </div>

      <Modal
        open={confirming}
        title="Confirm status change"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={applyStatus} loading={saving}>
              Confirm {nextStatus ? statusLabel(nextStatus) : ''}
            </Button>
          </>
        }
      >
        <p>
          Move <strong className="text-white">{job.jobId}</strong> from <strong className="text-white">{statusLabel(job.currentStatus)}</strong> to{' '}
          <strong className="text-white">{nextStatus ? statusLabel(nextStatus) : '—'}</strong>?
        </p>
        <p className="mt-2 text-xs text-slate-500">The change is recorded in the job's status history.</p>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-200">{value}</p>
    </div>
  );
}
