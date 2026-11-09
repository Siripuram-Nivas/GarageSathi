import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, Wrench } from 'lucide-react';
import { ApiError, api } from '../lib/api';
import type { Job, JobStatus } from '../types';
import { NEXT_STATUS, formatDate, formatINR, statusLabel, statusTone } from '../lib/format';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, useToast } from '../components/ui';
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
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    api
      .job(id)
      .then((res) => setJob(res.job))
      .catch((e) => setError(e.message));
  }, [id]);

  async function applyStatus() {
    if (!job || !nextStatus) return;
    setSaving(true);
    setActionError('');
    try {
      const { job: updated } = await api.updateStatus(job.jobId, nextStatus, note || undefined);
      setJob(updated);
      setNextStatus('');
      setNote('');
      setConfirming(false);
      push(`Status updated to ${statusLabel(updated.currentStatus)}.`, 'success');
    } catch (e) {
      setActionError((e as Error).message);
      push((e as Error).message, 'error');
      // Someone else moved this job first: reload so the mechanic sees the real state.
      if (e instanceof ApiError && e.status === 409) {
        api
          .job(id)
          .then(({ job: fresh }) => {
            setJob(fresh);
            setNextStatus('');
            setNote('');
            setConfirming(false);
          })
          .catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-rose-600">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/jobs')}>
          Back to job cards
        </Button>
      </Card>
    );
  }
  if (!job) {
    return (
      <div aria-busy="true">
        <PageHeader title="Job card" subtitle="Loading job card…" />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Card className="space-y-4 p-5">
              <Skeleton className="h-6 w-48" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-20 w-full" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-4 h-24 w-full" />
            </Card>
          </div>
          <Card className="space-y-3 p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  const allowed = NEXT_STATUS[job.currentStatus];

  return (
    <div>
      <PageHeader
        title={`Job {job.jobId}`}
        subtitle={`Created {formatDate(job.createdAt)} · {job.aiMode === 'live' ? 'Live Gnani' : 'Mock'} intake`}
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
              <Badge tone={job.approvalStatus === 'APPROVED' ? 'aubergine' : 'marigold'}>{job.approvalStatus === 'APPROVED' ? 'Estimate approved' : 'Awaiting approval'}</Badge>
              {job.aiMode === 'mock' && <Badge tone="marigold">MOCK INTAKE</Badge>}
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
              <p className="text-xs uppercase tracking-wide text-muted">Customer-reported complaint</p>
              <p className="mt-1 rounded-xl border border-border bg-white p-3 text-sm text-deep-aubergine">{job.customerComplaint || '—'}</p>
              <p className="mt-1 text-xs text-muted">Not a mechanical diagnosis. Final findings belong in mechanic notes after inspection.</p>
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
              <div className="mt-4 rounded-xl border border-marigold/30 bg-marigold/5 p-3 text-sm text-marigold">
                <p className="font-medium text-marigold">Unresolved service terms</p>
                <ul className="mt-1 list-inside list-disc">
                  {job.unresolvedItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {job.mechanicNotes && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-muted">Mechanic notes</p>
                <p className="mt-1 text-sm text-deep-aubergine">{job.mechanicNotes}</p>
              </div>
            )}

            <details className="mt-5 rounded-xl border border-border bg-white p-3">
              <summary className="cursor-pointer text-sm text-muted">Original transcript (preserved)</summary>
              <p className="mt-2 text-sm text-deep-aubergine">{job.originalTranscript}</p>
            </details>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="flex items-center gap-2 font-medium text-deep-aubergine font-serif">
                <Wrench size={16} /> Service estimate
              </h2>
              <p className="text-xs text-muted">Prices are a snapshot of the catalogue at approval time.</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-4 py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {job.serviceItems.map((item) => (
                  <tr key={item.serviceId}>
                    <td className="px-4 py-2.5 text-deep-aubergine">{item.serviceName}</td>
                    <td className="px-4 py-2.5 text-muted">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-muted">{formatINR(item.unitPricePaise)}</td>
                    <td className="px-4 py-2.5 text-right text-deep-aubergine">{formatINR(item.lineTotalPaise)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="px-4 py-3 text-right text-muted">
                    Estimated total
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-semibold text-deep-aubergine">{formatINR(job.estimateTotalPaise)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-medium text-deep-aubergine font-serif">Telugu confirmation</h2>
            <p className="mt-1 text-xs text-muted">Job number and amount are spoken in Telugu words.</p>
            <div className="mt-3">
              <SpeakButton jobId={job.jobId} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-medium text-deep-aubergine font-serif">Update status</h2>
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
                <Button
                  className="w-full"
                  disabled={!nextStatus}
                  onClick={() => {
                    setActionError('');
                    setConfirming(true);
                  }}
                >
                  Update status
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">This job is in a final state. No further transitions are allowed.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-medium text-deep-aubergine font-serif">
              <Clock3 size={15} /> Status history
            </h2>
            <ol className="mt-3 space-y-3">
              {job.statusHistory.map((event, index) => (
                <li key={`${event.status}-${index}`} className="relative border-l border-border pl-4">
                  <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-marigold" />
                  <p className="text-sm text-deep-aubergine">{statusLabel(event.status)}</p>
                  <p className="text-xs text-muted">{formatDate(event.at)}</p>
                  {event.note && <p className="mt-0.5 text-xs text-muted">{event.note}</p>}
                </li>
              ))}
            </ol>
            {!job.statusHistory.length && <EmptyState title="No history" hint="Status changes will appear here." />}
          </Card>
        </div>
      </div>

      <Modal
        open={confirming}
        title={nextStatus === 'CANCELLED' ? 'Cancel this job?' : 'Confirm status change'}
        onClose={() => setConfirming(false)}
        dismissOnBackdrop={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>
              Keep current status
            </Button>
            <Button variant={nextStatus === 'CANCELLED' ? 'danger' : 'primary'} onClick={applyStatus} loading={saving}>
              {nextStatus === 'CANCELLED' ? 'Cancel job' : `Confirm {nextStatus ? statusLabel(nextStatus) : ''}`}
            </Button>
          </>
        }
      >
        <p>
          Move <strong className="text-deep-aubergine">{job.jobId}</strong> from <strong className="text-deep-aubergine">{statusLabel(job.currentStatus)}</strong> to{' '}
          <strong className="text-deep-aubergine">{nextStatus ? statusLabel(nextStatus) : '—'}</strong>?
        </p>
        {nextStatus === 'CANCELLED' ? (
          <p className="mt-2 rounded-xl border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700">
            Cancelling is final: the job cannot be reopened from this screen, and it is excluded from approved revenue.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">The change is recorded in the job's status history.</p>
        )}
        {actionError && (
          <p role="alert" className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700">
            {actionError}
          </p>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-deep-aubergine">{value}</p>
    </div>
  );
}