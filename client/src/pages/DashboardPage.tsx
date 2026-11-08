import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BadgeIndianRupee, CheckCircle2, ClipboardList, Clock3, Mic, Plus, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import type { DashboardData } from '../types';
import { formatINR, statusLabel, statusTone } from '../lib/format';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from '../components/ui';

const STATUS_COLORS = ['#38bdf8', '#22d3ee', '#fbbf24', '#2dd4bf', '#34d399', '#10b981', '#64748b', '#f87171'];

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
        <p className="text-rose-300">{error}</p>
        <Button className="mt-4" onClick={load}>
          Retry
        </Button>
      </Card>
    );
  }
  if (!data) return <Spinner label="Loading garage metrics…" />;

  const stats = [
    { label: 'Total job cards', value: String(data.totalJobs), icon: ClipboardList, tone: 'text-slate-200' },
    { label: 'New / inspection', value: String((data.counts.RECEIVED ?? 0) + (data.counts.INSPECTION ?? 0)), icon: Clock3, tone: 'text-sky-300' },
    { label: 'Awaiting approval', value: String(data.awaitingApproval), icon: ClipboardList, tone: 'text-amber-300' },
    { label: 'In progress', value: String(data.counts.IN_PROGRESS ?? 0), icon: Wrench, tone: 'text-cyan-300' },
    { label: 'Completed', value: String(data.counts.COMPLETED ?? 0), icon: CheckCircle2, tone: 'text-emerald-300' },
    { label: 'Approved estimates', value: formatINR(data.estimatedRevenuePaise), icon: BadgeIndianRupee, tone: 'text-teal-300' },
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
            <div className={`rounded-xl border border-ink-600 bg-ink-800 p-2.5 ${tone}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className="text-xl font-semibold text-white">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        <Card className="p-4 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-slate-200">Service revenue (approved)</h2>
            <span className="text-xs text-slate-500">₹, from catalogue prices</span>
          </div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f3350" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} stroke="#2c4468" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#2c4468" />
                <Tooltip
                  contentStyle={{ background: '#0e1728', border: '1px solid #2c4468', borderRadius: 12, color: '#e2e8f0' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#2dd4bf" radius={[6, 6, 0, 0]} maxBarSize={54} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No approved estimates yet" hint="Approve a voice job card and its catalogue revenue appears here." />
          )}
        </Card>

        <Card className="p-4 xl:col-span-2">
          <h2 className="mb-3 font-medium text-slate-200">Job status distribution</h2>
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="status" innerRadius={52} outerRadius={85} paddingAngle={3}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0e1728', border: '1px solid #2c4468', borderRadius: 12, color: '#e2e8f0' }}
                  formatter={(value, name) => [value, String(name).replace(/_/g, ' ')]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No jobs yet" hint="Start with a voice job card to see the status mix." />
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {pieData.map((s, i) => (
              <span key={s.status} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                {statusLabel(s.status)} ({s.count})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
          <h2 className="font-medium text-slate-200">Recent job cards</h2>
          <Link to="/jobs" className="text-xs text-teal-300 hover:text-teal-200">
            View all
          </Link>
        </div>
        {data.recentJobs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Job</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Vehicle</th>
                  <th className="px-4 py-2.5 font-medium">Estimate</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {data.recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-ink-800/60">
                    <td className="px-4 py-3 font-medium text-slate-200">{job.jobId}</td>
                    <td className="px-4 py-3 text-slate-300">{job.customerName || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{[job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-slate-200">{formatINR(job.estimateTotalPaise)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(job.currentStatus)}>{statusLabel(job.currentStatus)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/jobs/${job.jobId}`} className="inline-flex items-center gap-1 text-xs text-teal-300 hover:text-teal-200">
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

      <p className="mt-4 text-xs text-slate-500">
        Mode: <Badge tone={data.aiMode === 'live' ? 'teal' : 'amber'}>{data.aiMode === 'live' ? 'LIVE' : 'MOCK'}</Badge>{' '}
        {data.aiMode === 'mock' ? 'Demo data is clearly labelled; no Gnani credits are used.' : 'Live Gnani calls are made only on explicit actions.'}
      </p>
    </div>
  );
}
