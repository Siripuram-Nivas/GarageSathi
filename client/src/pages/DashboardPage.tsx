import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BadgeIndianRupee, CheckCircle2, ClipboardList, Clock3, Mic, Plus, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import type { DashboardData } from '../types';
import { formatINR, statusLabel, statusTone } from '../lib/format';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '../components/ui';

const STATUS_COLORS = ['#3A0F34', '#EAAA00', '#6366F1', '#2563EB', '#EF4444', '#22C55E', '#74849A', '#F87171'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-rose-600">{error}</p>
        <Button className="mt-4" onClick={load}>
          Retry
        </Button>
      </Card>
    );
  }
  if (!data) {
    return (
      <div aria-busy="true">
        <PageHeader title="Garage dashboard" subtitle="Loading garage metrics…" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          <Card className="p-4 xl:col-span-3">
            <Skeleton className="mb-4 h-5 w-52" />
            <Skeleton className="h-56 w-full" />
          </Card>
          <Card className="p-4 xl:col-span-2">
            <Skeleton className="mb-4 h-5 w-44" />
            <Skeleton className="h-56 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total job cards', value: String(data.totalJobs), icon: ClipboardList, tone: 'text-deep-aubergine' },
    { label: 'New / inspection', value: String((data.counts.RECEIVED ?? 0) + (data.counts.INSPECTION ?? 0)), icon: Clock3, tone: 'text-sky-600' },
    { label: 'Awaiting approval', value: String(data.awaitingApproval), icon: ClipboardList, tone: 'text-marigold' },
    { label: 'In progress', value: String(data.counts.IN_PROGRESS ?? 0), icon: Wrench, tone: 'text-cyan-600' },
    { label: 'Completed', value: String(data.counts.COMPLETED ?? 0), icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: 'Approved estimates', value: formatINR(data.estimatedRevenuePaise), icon: BadgeIndianRupee, tone: 'text-deep-aubergine' },
  ];

  const chartData = data.serviceBreakdown.map((s) => ({ name: s.serviceName, revenue: s.revenuePaise / 100, quantity: s.quantity }));
  const pieData = data.statusDistribution.filter((s) => s.count > 0);

  return (
    <div>
      <PageHeader
        title="Garage dashboard"
        subtitle="Live counts from saved job cards. Estimates are provisional until inspection."
        actions={
          <Link to="/new">
            <Button>
              <Mic size={16} /> New voice job
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-center gap-4 p-4">
            <div className={`rounded-xl border border-border bg-white p-2.5 ${tone}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
              <p className="text-xl font-semibold text-deep-aubergine">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        <Card className="p-4 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-deep-aubergine font-serif">Service revenue (approved)</h2>
            <span className="text-xs text-muted">₹, from catalogue prices</span>
          </div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C4CDD5" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#66717D', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} stroke="#C4CDD5" />
                <YAxis tick={{ fill: '#66717D', fontSize: 11 }} stroke="#C4CDD5" />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #C4CDD5', borderRadius: 12, color: '#3A0F34' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3A0F34" radius={[6, 6, 0, 0]} maxBarSize={54} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No approved estimates yet" hint="Approve a voice job card and its catalogue revenue appears here." />
          )}
        </Card>

        <Card className="p-4 xl:col-span-2">
          <h2 className="mb-3 font-medium text-deep-aubergine font-serif">Job status distribution</h2>
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="status" innerRadius={52} outerRadius={85} paddingAngle={3}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #C4CDD5', borderRadius: 12, color: '#3A0F34' }}
                  formatter={(value, name) => [value, String(name).replace(/_/g, ' ')]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No jobs yet" hint="Start with a voice job card to see the status mix." />
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {pieData.map((s, i) => (
              <span key={s.status} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                {statusLabel(s.status)} ({s.count})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium text-deep-aubergine font-serif">Recent job cards</h2>
          <Link to="/jobs" className="text-xs text-marigold hover:text-amber-600">
            View all
          </Link>
        </div>
        {data.recentJobs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-medium">Job</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Vehicle</th>
                  <th className="px-4 py-2.5 font-medium">Estimate</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-ice-silver/50">
                    <td className="px-4 py-3 font-medium text-deep-aubergine">{job.jobId}</td>
                    <td className="px-4 py-3 text-deep-aubergine">{job.customerName || '—'}</td>
                    <td className="px-4 py-3 text-muted">{[job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-deep-aubergine">{formatINR(job.estimateTotalPaise)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(job.currentStatus)}>{statusLabel(job.currentStatus)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/jobs/${job.jobId}`} className="inline-flex items-center gap-1 text-xs text-marigold hover:text-amber-600">
                        Open <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No job cards yet"
            hint="Record a Telugu complaint and let GarageSathi build the job card."
            action={
              <Link to="/new">
                <Button variant="secondary">
                  <Plus size={16} /> Create the first job
                </Button>
              </Link>
            }
          />
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        Mode: <Badge tone={data.aiMode === 'live' ? 'aubergine' : 'marigold'}>{data.aiMode === 'live' ? 'LIVE' : 'MOCK'}</Badge>{' '}
        {data.aiMode === 'mock' ? 'Demo data is clearly labelled; no Gnani credits are used.' : 'Live Gnani calls are made only on explicit actions.'}
      </p>
    </div>
  );
}