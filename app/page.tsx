'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Briefcase, Users, CheckCircle2, Clock, PlayCircle, AlertTriangle,
  RefreshCw, TrendingUp, Calendar, ArrowRight, WifiOff, HelpCircle,
  Send, X, Bell,
} from 'lucide-react';
import Link from 'next/link';
import { dashboardApi, DashboardData, Job, AuditLog, AlertStep } from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import Header from '@/components/Header';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { useWebSocket } from '@/hooks/useWebSocket';

const ACTIVE_JOBS_PREVIEW_COUNT = 3;

function ProgressBar({ value, total, color = '#f59e0b' }: { value: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  if (type.includes('COMPLETED')) return <CheckCircle2 size={14} className="text-green-500" />;
  if (type.includes('STARTED') || type.includes('CREATED')) return <PlayCircle size={14} className="text-blue-500" />;
  if (type.includes('ISSUE')) return <AlertTriangle size={14} className="text-red-500" />;
  return <Clock size={14} className="text-slate-400" />;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Alert reply state
  const [replyAlertId, setReplyAlertId] = useState<string | null>(null);
  const [replyText, setReplyText]       = useState('');
  const [replySending, setReplySending] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ workerName: string; jobNumber: string; type: 'reply' | 'resolve' } | null>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await dashboardApi.getStats();
      setData(res.data.data);
      setLastUpdated(new Date());

    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Refresh instantly when a worker sends ISSUE or HELP via WhatsApp
  useWebSocket((msg) => {
    if (msg.event === 'step_issue' || msg.event === 'step_help' || msg.event === 'issue_resolved') {
      load();
    }
  });

  useEffect(() => {
    if (replyAlertId) replyInputRef.current?.focus();
  }, [replyAlertId]);

  function getAdminId() {
    try { return JSON.parse(localStorage.getItem('auth_user') ?? '{}').id ?? 'admin'; } catch { return 'admin'; }
  }

  function showToast(workerName: string, jobNumber: string, type: 'reply' | 'resolve') {
    setToast({ workerName, jobNumber, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAlertReply(alert: AlertStep) {
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/reply-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: alert.id, adminId: getAdminId(), message: replyText.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        // Dismiss this alert from the panel
        setDismissedAlerts(prev => new Set(prev).add(alert.id));
        setReplyText('');
        setReplyAlertId(null);
        showToast(json.data?.workerName ?? alert.assignedUser?.name ?? 'Worker', alert.job.jobNumber, 'reply');
      }
    } catch { /* silently ignore */ }
    finally { setReplySending(false); }
  }

  async function handleResolveStep(alert: AlertStep) {
    const confirmed = window.confirm(
      `Resolve the alert for ${alert.assignedUser?.name ?? 'this worker'} on ${alert.job.jobNumber} (${alert.name})? The worker will be notified to continue.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/resolve-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: alert.id, adminId: getAdminId() }),
      });
      if (res.ok) {
        const json = await res.json();
        setDismissedAlerts(prev => new Set(prev).add(alert.id));
        setReplyAlertId(null);
        showToast(json.data?.workerName ?? alert.assignedUser?.name ?? 'Worker', alert.job.jobNumber, 'resolve');
      }
    } catch { /* silently ignore */ }
  }

  async function handleQuickReply(alert: AlertStep, message: string) {
    setReplySending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/reply-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: alert.id, adminId: getAdminId(), message }),
      });
      if (res.ok) {
        const json = await res.json();
        setDismissedAlerts(prev => new Set(prev).add(alert.id));
        setReplyAlertId(null);
        showToast(json.data?.workerName ?? alert.assignedUser?.name ?? 'Worker', alert.job.jobNumber, 'reply');
      }
    } catch { /* silently ignore */ }
    finally { setReplySending(false); }
  }

  const stats = data?.stats;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : undefined}
        action={
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors font-medium shadow-sm"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto" style={{ background: '#f8fafc' }}>
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
            <WifiOff size={16} className="flex-shrink-0" />
            <span>Cannot connect to backend. Make sure the backend server is running on port 4000.</span>
            <button onClick={load} className="ml-auto text-red-600 hover:underline font-semibold">Retry</button>
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-200/80 shadow-sm" />
            ))}
          </div>
        ) : (
          <>
            {/* ─── Stats Grid ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard label="Total Jobs"    value={stats?.totalJobs     ?? 0} icon={Briefcase}     color="slate"  href="/jobs" />
              <StatsCard label="Active"        value={stats?.activeJobs    ?? 0} icon={PlayCircle}    color="amber"  href="/jobs?status=IN_PROGRESS" />
              <StatsCard label="Completed"     value={stats?.completedJobs ?? 0} icon={CheckCircle2}  color="green"  href="/jobs?status=COMPLETED" />
              <StatsCard label="Pending"       value={stats?.pendingJobs   ?? 0} icon={Clock}         color="blue"   href="/jobs?status=PENDING" />
              <StatsCard label="Upcoming"      value={stats?.upcomingJobs  ?? 0} icon={Calendar}      color="purple" href="/jobs?status=UPCOMING" />
              <StatsCard label="Overdue"       value={stats?.overdueJobs   ?? 0} icon={AlertTriangle} color="red"    href="/jobs?status=OVERDUE" />
              <StatsCard label="Alerts"        value={stats?.alertCount    ?? 0} icon={HelpCircle}    color="red"    href="/alerts" />
              <StatsCard label="Team Members"  value={stats?.totalUsers    ?? 0} icon={Users}         color="purple" href="/users" />
            </div>

            {/* ─── Middle Row ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Active Jobs */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <TrendingUp size={14} className="text-amber-600" />
                    </span>
                    Active Jobs
                  </h2>
                  <Link href="/jobs?status=IN_PROGRESS" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 transition-colors">
                    View all <ArrowRight size={11} />
                  </Link>
                </div>
                <div className="divide-y divide-slate-50/80">
                  {data?.recentJobs?.filter(j => j.status === 'IN_PROGRESS').slice(0, ACTIVE_JOBS_PREVIEW_COUNT).map((job: Job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-amber-50/40 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-200/60">
                        <Briefcase size={15} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-slate-800 text-sm truncate">{job.title}</p>
                          <PriorityBadge priority={job.priority} />
                        </div>
                        <p className="text-xs text-slate-400 mb-1.5">{job.jobNumber} · {job.clientName}</p>
                        <ProgressBar value={job.completedSteps} total={job.totalSteps} />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Deadline</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{new Date(job.deadline).toLocaleDateString()}</p>
                        <ArrowRight size={13} className="text-slate-300 group-hover:text-amber-500 mt-1.5 ml-auto transition-colors" />
                      </div>
                    </Link>
                  ))}
                  {(!data?.recentJobs || data.recentJobs.filter(j => j.status === 'IN_PROGRESS').length === 0) && (
                    <div className="px-5 py-12 text-center text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Briefcase size={24} className="opacity-40" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">No active jobs</p>
                      <Link href="/jobs/new" className="text-xs text-amber-600 hover:underline font-semibold mt-1 inline-block">Create one →</Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-white">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Clock size={14} className="text-slate-500" />
                    </span>
                    Recent Activity
                  </h2>
                </div>
                <div className="divide-y divide-slate-50/80 max-h-80 overflow-y-auto">
                  {data?.recentActivity?.map((log: AuditLog) => (
                    <div key={log.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <ActivityIcon type={log.eventType} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 leading-snug font-medium">{log.description}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {(!data?.recentActivity || data.recentActivity.length === 0) && (
                    <div className="px-5 py-8 text-center text-slate-400 text-sm">No activity yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Toast notification after reply / resolve ─── */}
            {toast && (
              <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
                <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${
                  toast.type === 'resolve'
                    ? 'bg-green-900 border-green-700 text-white'
                    : 'bg-slate-900 border-amber-500 text-white'
                }`} style={{ minWidth: 280, maxWidth: 360 }}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    toast.type === 'resolve' ? 'bg-green-700' : 'bg-amber-500'
                  }`}>
                    {toast.type === 'resolve'
                      ? <CheckCircle2 size={18} className="text-white" />
                      : <Send size={16} className="text-slate-900" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">
                      {toast.type === 'resolve' ? 'Issue Resolved' : 'Message Sent'}
                    </p>
                    <p className="text-xs mt-0.5 text-slate-300">
                      {toast.type === 'resolve'
                        ? `✅ ${toast.workerName} notified — alert cleared from Job #${toast.jobNumber}`
                        : `📩 ${toast.workerName} received your message on Job #${toast.jobNumber} with reply options`}
                    </p>
                    {toast.type === 'reply' && (
                      <p className="text-xs mt-1 text-amber-400 font-semibold">Worker will reply: DONE / ISSUE / HELP</p>
                    )}
                  </div>
                  <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white mt-0.5">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Alerts Panel ─── */}
            {(() => {
              const visibleAlerts = (data?.alertSteps ?? []).filter((a: AlertStep) => !dismissedAlerts.has(a.id));
              if (visibleAlerts.length === 0) return null;
              const previewAlerts = visibleAlerts.slice(0, 3);
              const hasMore = visibleAlerts.length > 3;
              return (
              <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)', borderBottom: '1px solid #fecaca' }}>
                  <h2 className="font-bold text-red-800 flex items-center gap-2 text-sm">
                    <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-red-600" />
                    </span>
                    Active Alerts
                    <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold shadow-sm">{visibleAlerts.length}</span>
                  </h2>
                  <Link href="/alerts" className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold transition-colors">
                    View all <ArrowRight size={11} />
                  </Link>
                </div>
                <div className="divide-y divide-red-50">
                  {previewAlerts.map((alert: AlertStep) => (
                    <div key={alert.id} className="px-5 py-4 hover:bg-red-50/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          alert.status === 'ISSUE' ? 'bg-red-100' : 'bg-orange-100'
                        }`}>
                          {alert.status === 'ISSUE'
                            ? <AlertTriangle size={15} className="text-red-600" />
                            : <HelpCircle size={15} className="text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-red-900">
                            {alert.status === 'ISSUE' ? '⚠️ Issue' : '🆘 Help'} — {alert.name}
                          </p>
                          <p className="text-xs text-red-600 font-medium mt-0.5">{alert.job.jobNumber} · {alert.job.title}</p>
                          {alert.issueText && (
                            <p className="text-xs text-red-500 mt-1 italic bg-red-50 rounded-lg px-2 py-1">"{alert.issueText}"</p>
                          )}
                          <p className="text-xs text-red-400 mt-1">
                            Worker: <span className="font-semibold text-red-600">{alert.assignedUser?.name ?? 'Unknown'}</span> · {new Date(alert.updatedAt).toLocaleString()}
                          </p>
                          {replyAlertId === alert.id && (
                            <div className="mt-2.5 space-y-2">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Quick Reply</p>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { label: '✅ Continue', msg: 'Please continue with the task — we are aware of the situation.' },
                                  { label: '🔍 Will inspect', msg: 'We will come to inspect shortly. Please wait.' },
                                  { label: '📸 Take photos', msg: 'Please take photos of the issue and wait for instructions.' },
                                  { label: '📝 Issue noted', msg: 'Issue noted. Please hold and wait for our response.' },
                                ].map(({ label, msg }) => (
                                  <button
                                    key={label}
                                    onClick={() => handleQuickReply(alert, msg)}
                                    disabled={replySending}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition-all disabled:opacity-50"
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  ref={replyInputRef}
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleAlertReply(alert);
                                    if (e.key === 'Escape') setReplyAlertId(null);
                                  }}
                                  placeholder="Or type a custom message…"
                                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-slate-400"
                                />
                                <button
                                  onClick={() => handleAlertReply(alert)}
                                  disabled={replySending || !replyText.trim()}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-900 disabled:opacity-50 transition-all shadow-sm"
                                  style={{ background: '#f59e0b' }}
                                >
                                  <Send size={12} /> {replySending ? '…' : 'Send'}
                                </button>
                                <button onClick={() => setReplyAlertId(null)} className="p-2 text-red-400 hover:text-red-600">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {replyAlertId !== alert.id && (
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => { setReplyAlertId(alert.id); setReplyText(''); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 transition-all shadow-sm"
                              style={{ background: '#f59e0b' }}
                            >
                              <Send size={11} /> Reply
                            </button>
                            <button
                              onClick={() => handleResolveStep(alert)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 transition-colors"
                            >
                              <CheckCircle2 size={11} /> Resolve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="px-5 py-3 border-t border-red-100 bg-red-50/60 rounded-b-2xl">
                    <Link href="/alerts" className="flex items-center justify-center gap-2 text-xs font-bold text-red-700 hover:text-red-900 transition-colors">
                      <Bell size={12} /> View {visibleAlerts.length - 3} more alert{visibleAlerts.length - 3 > 1 ? 's' : ''} <ArrowRight size={11} />
                    </Link>
                  </div>
                )}
              </div>
              );
            })()}

            {/* ─── Quick Actions ─── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-amber-400 inline-block" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { href: '/jobs/new', label: 'Create New Job', icon: Briefcase, gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
                  { href: '/users', label: 'Manage Team', icon: Users, gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
                  { href: '/workflows', label: 'Workflow Templates', icon: Calendar, gradient: 'linear-gradient(135deg, #c084fc, #a855f7)' },
                  { href: '/jobs', label: 'View All Jobs', icon: TrendingUp, gradient: 'linear-gradient(135deg, #4ade80, #22c55e)' },
                ].map(({ href, label, icon: Icon, gradient }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/50 hover:shadow-sm transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: gradient }}>
                      <Icon size={15} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-700 transition-colors">{label}</span>
                    <ArrowRight size={13} className="text-slate-300 group-hover:text-amber-500 ml-auto transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
