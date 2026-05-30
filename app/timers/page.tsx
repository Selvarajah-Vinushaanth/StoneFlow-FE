'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Timer, WifiOff, RefreshCw, AlarmCheck, CheckCircle2, PlayCircle, Bell, Clock,
} from 'lucide-react';
import { jobsApi } from '@/lib/api';
import Header from '@/components/Header';
import { useWebSocket, WsMessage } from '@/hooks/useWebSocket';

interface ActiveTimerEntry {
  id: string;
  name: string;
  stepNumber: number | null;
  stepId?: string;
  status: string;
  timerStartedAt: string | null;
  durationMinutes: number | null;
  assignedUser?: { id: string; name: string; phone: string; role: string } | null;
  job: { id: string; jobNumber: string; title: string; clientName: string };
  parentStep: { id: string; stepNumber: number; name: string } | null;
  isSubTask: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS: 'text-amber-600',
  NOTIFIED:    'text-blue-600',
  WAITING:     'text-slate-500',
};

// ─── Per-step live countdown cell ────────────────────────────────────────────
function CountdownCell({ step, onExpired }: { step: ActiveTimerEntry; onExpired: (id: string) => void }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const alarmFired = useRef(false);

  useEffect(() => {
    if (!step.timerStartedAt || !step.durationMinutes) { setRemaining(null); return; }
    const tick = () => {
      const elapsed = (Date.now() - new Date(step.timerStartedAt!).getTime()) / 1000;
      const total = step.durationMinutes! * 60;
      const rem = Math.max(0, total - elapsed);
      setRemaining(rem);
      if (rem === 0 && !alarmFired.current) {
        alarmFired.current = true;
        onExpired(step.id);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step.timerStartedAt, step.durationMinutes, step.id, onExpired]);

  if (remaining === null) return <span className="text-slate-400 text-xs">—</span>;

  const total = step.durationMinutes! * 60;
  const pct = Math.min(100, ((total - remaining) / total) * 100);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const isOverdue = remaining === 0;
  const isWarning = remaining <= 120 && remaining > 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-shrink-0 w-16 text-right">
        {isOverdue ? (
          <span className="text-xs font-bold text-red-600 animate-pulse">EXPIRED</span>
        ) : (
          <span className={`text-sm font-mono font-bold ${isWarning ? 'text-orange-600' : 'text-slate-800'}`}>
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${pct}%`,
            background: isOverdue ? '#ef4444' : isWarning ? '#f97316' : '#f59e0b',
          }}
        />
      </div>
      <span className="text-xs text-slate-400">{step.durationMinutes}m</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimersPage() {
  const [steps, setSteps]       = useState<ActiveTimerEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [expired, setExpired]   = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setFetchError(false);
    try {
      const r = await jobsApi.getActiveTimers();
      setSteps(r.data.data as ActiveTimerEntry[]);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reload on WebSocket events
  useWebSocket((msg: WsMessage) => {
    if (['step_completed', 'workflow_started'].includes(msg.event)) load();
  });

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const handleExpired = useCallback((stepId: string) => {
    setExpired(s => new Set(s).add(stepId));
  }, []);

  const handleClearTimer = async (entry: ActiveTimerEntry) => {
    try {
      if (entry.isSubTask && entry.stepId) {
        await jobsApi.resetSubTaskTimer(entry.job.id, entry.stepId, entry.id);
      } else {
        await jobsApi.resetTimer(entry.job.id, entry.id);
      }
      setExpired(s => { const n = new Set(s); n.delete(entry.id); return n; });
      await load();
    } catch { /* ignore */ }
  };

  const alerts = steps.filter(s => expired.has(s.id) && !dismissed.has(s.id));

  return (
    <>
      <Header title="Timer Monitor" subtitle="Live countdown for all active workflow step timers" />
      <main className="flex-1 overflow-y-auto" style={{ background: '#f8fafc' }}>
        <div className="px-8 pt-6 pb-8 space-y-5">

          {/* Expired alarms */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map(s => (
                <div key={s.id} className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-2xl px-5 py-4 animate-pulse">
                  <AlarmCheck size={20} className="text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-red-700 text-sm flex items-center gap-1.5">
                      Time&apos;s Up! — {s.name}
                      {s.isSubTask && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Sub-task</span>
                      )}
                    </p>
                    <p className="text-red-600 text-xs mt-0.5">
                      {s.job.title} ({s.job.jobNumber})
                      {s.isSubTask && s.parentStep ? ` · Step: ${s.parentStep.name}` : ''}
                      {s.assignedUser ? ` · Worker: ${s.assignedUser.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleClearTimer(s)}
                      className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      Clear Timer
                    </button>
                    <button
                      onClick={() => setDismissed(d => new Set(d).add(s.id))}
                      className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100"><Timer size={18} className="text-amber-600" /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active Timers</p>
                <p className="text-2xl font-extrabold text-slate-800">{steps.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100"><AlarmCheck size={18} className="text-red-600" /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Expired</p>
                <p className="text-2xl font-extrabold text-red-700">{expired.size}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100"><CheckCircle2 size={18} className="text-green-600" /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">On Track</p>
                <p className="text-2xl font-extrabold text-green-700">{steps.length - expired.size}</p>
              </div>
            </div>
          </div>

          {/* Timer table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Active Timers</h3>
              <button onClick={load} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
                <RefreshCw size={15} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <WifiOff size={32} className="opacity-40" />
                <p className="text-sm">Could not load timers — backend may be offline</p>
                <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <RefreshCw size={13} /> Retry
                </button>
              </div>
            ) : steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Timer size={36} className="opacity-30" />
                <p className="text-sm">No active timers</p>
                <p className="text-xs">Open a job → Workflow tab → Set Timer on a step or sub-task to start tracking</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Job</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Step / Sub-task</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Worker</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Started</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Time Remaining</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {steps.map(step => {
                    const statusColor = STATUS_COLOR[step.status] || 'text-slate-500';
                    const isExpired = expired.has(step.id);
                    return (
                      <tr key={step.id} className={`${isExpired ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-3">
                          <Link href={`/jobs/${step.job.id}`} className="hover:text-amber-600 transition-colors">
                            <p className="font-semibold text-slate-800">{step.job.title}</p>
                            <p className="text-xs text-slate-400 font-mono">{step.job.jobNumber}</p>
                            <p className="text-xs text-slate-400">{step.job.clientName}</p>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {step.isSubTask ? (
                              <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none">Sub</span>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {step.stepNumber}
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-slate-700">{step.name}</span>
                              {step.isSubTask && step.parentStep && (
                                <p className="text-[10px] text-slate-400 mt-0.5">↳ Step {step.parentStep.stepNumber}: {step.parentStep.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {step.assignedUser ? (
                            <div>
                              <p className="font-medium text-slate-700 text-xs">{step.assignedUser.name}</p>
                              <p className="text-xs text-slate-400">{step.assignedUser.role?.replace(/_/g, ' ')}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            {step.status === 'IN_PROGRESS' && <PlayCircle size={13} className="text-amber-500" />}
                            {step.status === 'NOTIFIED' && <Bell size={13} className="text-blue-500" />}
                            {step.status === 'WAITING' && <Clock size={13} className="text-slate-400" />}
                            <span className={`text-xs font-medium ${statusColor}`}>
                              {step.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {step.timerStartedAt
                            ? new Date(step.timerStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <CountdownCell step={step} onExpired={handleExpired} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/jobs/${step.job.id}`}
                              className="text-xs px-2.5 py-1 border border-slate-300 text-slate-600 rounded-lg hover:border-amber-400 hover:text-amber-600">
                              View Job
                            </Link>
                            <button
                              onClick={() => handleClearTimer(step)}
                              className="text-xs px-2.5 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                            >
                              Clear
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
