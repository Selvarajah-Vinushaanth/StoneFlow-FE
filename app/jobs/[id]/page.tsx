'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Play, RefreshCw, Clock, CheckCircle2, AlertTriangle,
  Phone, User, Calendar, Layers, Camera, MessageSquare, Briefcase,
  ChevronRight, HelpCircle, Timer,
} from 'lucide-react';
import { jobsApi, Job, AuditLog } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import WorkflowTimeline from '@/components/WorkflowTimeline';
import { useWebSocket, WsMessage } from '@/hooks/useWebSocket';

const DEMO_JOB: Job = {
  id: '1', jobNumber: 'JOB-2026-1001',
  title: 'Black Granite Kitchen Countertop',
  clientName: 'John Smith', clientPhone: '+60122334455',
  material: 'Black Granite', color: 'Jet Black',
  measurements: '3200mm x 600mm x 20mm',
  deadline: '2026-05-30', status: 'IN_PROGRESS', priority: 'HIGH',
  totalSteps: 6, completedSteps: 2,
  description: 'Full kitchen countertop in jet black granite with bullnose edge profile. Requires mirror polish.',
  createdAt: '2026-05-17T08:00:00Z',
  workflowSteps: [
    { id: 's1', jobId: '1', stepNumber: 1, name: 'Cutting', description: 'Cut to 3200x600mm', status: 'COMPLETED', startedAt: '2026-05-17T08:00:00Z', completedAt: '2026-05-17T10:00:00Z', assignedUser: { id: 'u2', name: 'Raju Kumar', phone: '+60198887766', role: 'CUTTER', language: 'TAMIL', isActive: true, createdAt: '' } },
    { id: 's2', jobId: '1', stepNumber: 2, name: 'Polishing', description: 'Mirror finish required', status: 'COMPLETED', startedAt: '2026-05-17T10:05:00Z', completedAt: '2026-05-17T13:00:00Z', assignedUser: { id: 'u3', name: 'Wei Ming', phone: '+60177654321', role: 'POLISHER', language: 'MANDARIN', isActive: true, createdAt: '' } },
    { id: 's3', jobId: '1', stepNumber: 3, name: 'Edge Finishing', description: 'Bullnose edge profile', status: 'IN_PROGRESS', startedAt: '2026-05-17T13:10:00Z', assignedUser: { id: 'u4', name: 'Rahim Hossain', phone: '+60112223344', role: 'EDGE_FINISHER', language: 'BANGLA', isActive: true, createdAt: '' } },
    { id: 's4', jobId: '1', stepNumber: 4, name: 'QC Inspection', description: 'Full quality check', status: 'WAITING', assignedUser: { id: 'u6', name: 'Siti Noraini', phone: '+60144556677', role: 'QC_INSPECTOR', language: 'BAHASA_MALAY', isActive: true, createdAt: '' } },
    { id: 's5', jobId: '1', stepNumber: 5, name: 'Packing', description: 'Wrap securely', status: 'WAITING' },
    { id: 's6', jobId: '1', stepNumber: 6, name: 'Installation', description: 'Install and upload photos', status: 'WAITING', assignedUser: { id: 'u5', name: 'James Lim', phone: '+60155443322', role: 'INSTALLER', language: 'ENGLISH', isActive: true, createdAt: '' } },
  ],
};

function ProgressRing({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={pct === 100 ? '#22c55e' : '#f59e0b'} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-800">{value}</span>
        <span className="text-xs text-slate-400">of {total}</span>
      </div>
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [tab, setTab] = useState<'workflow' | 'activity' | 'photos' | 'timers'>('workflow');
  const load = useCallback(async () => {
    try {
      const res = await jobsApi.get(id);
      setJob(res.data.data);
    } catch {
      setJob({ ...DEMO_JOB, id });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  // Real-time WebSocket updates — reload job when a relevant event arrives
  useWebSocket((msg: WsMessage) => {
    const jobId = msg.data?.jobId as string | undefined;
    if (jobId === id || !jobId) load();
  });

  const handleStart = async () => {
    if (!job) return;
    setStarting(true);
    try {
      await jobsApi.start(job.id);
      await load();
    } catch {
      alert('Start failed. Make sure backend is running.');
    } finally {
      setStarting(false);
    }
  };

  const handleCompleteStep = async (stepId: string) => {
    if (!job) return;
    try {
      await jobsApi.completeStep(job.id, stepId);
      await load();
    } catch {
      // Demo mode: simulate locally
      setJob(prev => {
        if (!prev) return prev;
        const steps = prev.workflowSteps.map(s => {
          if (s.id === stepId) return { ...s, status: 'COMPLETED' as const, completedAt: new Date().toISOString() };
          return s;
        });
        const completedCount = steps.filter(s => s.status === 'COMPLETED').length;
        const nextWaiting = steps.find(s => s.status === 'WAITING');
        if (nextWaiting) {
          const idx = steps.indexOf(nextWaiting);
          steps[idx] = { ...steps[idx], status: 'NOTIFIED' as const };
        }
        return { ...prev, workflowSteps: steps, completedSteps: completedCount };
      });
    }
  };

  const handleSetTimer = async (stepId: string, minutes: number) => {
    if (!job) return;
    try {
      await jobsApi.setTimer(job.id, stepId, minutes);
      await load();
    } catch {
      // Demo: update locally
      setJob(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          workflowSteps: prev.workflowSteps.map(s =>
            s.id === stepId
              ? { ...s, durationMinutes: minutes, timerStartedAt: new Date().toISOString() }
              : s
          ),
        };
      });
    }
  };

  const handleResetTimer = async (stepId: string) => {
    if (!job) return;
    try {
      await jobsApi.resetTimer(job.id, stepId);
      await load();
    } catch {
      setJob(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          workflowSteps: prev.workflowSteps.map(s =>
            s.id === stepId ? { ...s, durationMinutes: null, timerStartedAt: null } : s
          ),
        };
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) return null;

  const progress = job.totalSteps > 0 ? Math.round((job.completedSteps / job.totalSteps) * 100) : 0;
  const activeStep = job.workflowSteps.find(s => s.status === 'IN_PROGRESS' || s.status === 'NOTIFIED');
  const issueSteps = job.workflowSteps.filter(s => s.status === 'ISSUE' || s.status === 'HELP_NEEDED');

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link href="/jobs" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 truncate">{job.title}</h1>
            <span className="text-sm text-slate-400 font-mono">{job.jobNumber}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={job.status} />
            <PriorityBadge priority={job.priority} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={load}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          {job.status === 'PENDING' && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-900 transition-colors disabled:opacity-60"
              style={{ background: '#f59e0b' }}
            >
              <Play size={15} /> {starting ? 'Starting...' : 'Start Workflow'}
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 p-6 overflow-y-auto">
        {/* Issue Alert */}
        {issueSteps.length > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Attention Required</p>
              <p className="text-red-600 text-xs mt-0.5">
                {issueSteps.map(s => `Step ${s.stepNumber}: ${s.name}`).join(', ')} – reported an issue/help request
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ─── Left: Info + Timeline ─── */}
          <div className="xl:col-span-2 space-y-5">
            {/* Progress Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-6">
                <ProgressRing value={job.completedSteps} total={job.totalSteps} />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg">{progress}% Complete</h3>
                  <p className="text-slate-500 text-sm">{job.completedSteps} of {job.totalSteps} steps done</p>

                  {activeStep && (
                    <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 pulse-dot flex-shrink-0" />
                      <p className="text-xs text-amber-800">
                        <span className="font-semibold">Now:</span> Step {activeStep.stepNumber} – {activeStep.name}
                        {activeStep.assignedUser && ` (${activeStep.assignedUser.name})`}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> Deadline: <span className="font-medium text-slate-700">{new Date(job.deadline).toLocaleDateString()}</span>
                    </span>
                    {job.completedAt && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-green-500" /> Done: {new Date(job.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 overflow-x-auto">
                {[
                  { key: 'workflow', label: 'Workflow', icon: Layers },
                  { key: 'activity', label: 'Activity Log', icon: Clock },
                  { key: 'photos', label: 'Photos', icon: Camera },
                  { key: 'timers', label: 'Timers', icon: Timer },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key as typeof tab)}
                    className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                      tab === key
                        ? 'border-amber-500 text-amber-700 bg-amber-50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {tab === 'workflow' && (
                  <WorkflowTimeline
                    steps={job.workflowSteps}
                    onCompleteStep={handleCompleteStep}
                    onSetTimer={handleSetTimer}
                    onResetTimer={handleResetTimer}
                    isAdmin
                  />
                )}
                {tab === 'activity' && (
                  <div className="space-y-1">
                    {(job.auditLogs ?? []).length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Clock size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No activity yet — start the workflow to begin tracking</p>
                      </div>
                    ) : (
                      (job.auditLogs ?? []).map(log => (
                        <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="mt-1 flex-shrink-0">
                            {log.eventType.includes('COMPLETED') && <CheckCircle2 size={14} className="text-green-500" />}
                            {log.eventType.includes('STARTED') && <Play size={14} className="text-blue-500" />}
                            {log.eventType.includes('ISSUE') && <AlertTriangle size={14} className="text-red-500" />}
                            {log.eventType.includes('HELP') && <HelpCircle size={14} className="text-orange-500" />}
                            {log.eventType.includes('RESOLVED') && <CheckCircle2 size={14} className="text-purple-500" />}
                            {!log.eventType.includes('COMPLETED') && !log.eventType.includes('STARTED') && !log.eventType.includes('ISSUE') && !log.eventType.includes('HELP') && !log.eventType.includes('RESOLVED') && (
                              <Clock size={14} className="text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 leading-snug">{log.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {log.user && <span className="text-xs text-slate-400">{log.user.name}</span>}
                              <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {tab === 'photos' && (
                  <div className="text-center py-8 text-slate-400">
                    <Camera size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Photo uploads from workers will appear here</p>
                    <p className="text-xs mt-1">Workers send photos via WhatsApp MMS</p>
                  </div>
                )}
                {tab === 'timers' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Timer size={12} /> Set time limits per step. Workers are shown countdowns; admin sees live status here.
                    </p>
                    {job.workflowSteps.filter(s => s.status !== 'COMPLETED' && s.status !== 'SKIPPED').length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Timer size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">All steps completed — no active timers</p>
                      </div>
                    ) : (
                      job.workflowSteps
                        .filter(s => s.status !== 'COMPLETED' && s.status !== 'SKIPPED')
                        .map(step => {
                          const hasTimer = step.timerStartedAt && step.durationMinutes;
                          return (
                            <div key={step.id} className={`rounded-xl border px-4 py-3 ${hasTimer ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                              <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">
                                  {step.stepNumber}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm">{step.name}</p>
                                  {step.assignedUser && (
                                    <p className="text-xs text-slate-500">{step.assignedUser.name} · {step.assignedUser.role.replace(/_/g, ' ')}</p>
                                  )}
                                  {hasTimer && (
                                    <div className="mt-1.5 flex items-center gap-2 text-xs text-amber-700">
                                      <Timer size={12} />
                                      <span>Started {new Date(step.timerStartedAt!).toLocaleTimeString()} · {step.durationMinutes}min limit</span>
                                    </div>
                                  )}
                                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    {hasTimer ? (
                                      <button
                                        onClick={() => handleResetTimer(step.id)}
                                        className="text-xs px-2.5 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                                      >
                                        Clear Timer
                                      </button>
                                    ) : (
                                      [1, 15, 30, 45, 60, 90, 120].map(m => (
                                        <button
                                          key={m}
                                          onClick={() => handleSetTimer(step.id, m)}
                                          className="text-xs px-2.5 py-1 border border-slate-300 text-slate-600 rounded-lg hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50"
                                        >
                                          {m >= 60 ? `${m / 60}h` : `${m}m`}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Right: Job Info ─── */}
          <div className="space-y-4">
            {/* Client card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <User size={15} className="text-slate-400" /> Client
              </h3>
              <p className="font-bold text-slate-900">{job.clientName}</p>
              {job.clientPhone && (
                <a href={`tel:${job.clientPhone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-amber-600 mt-1 transition-colors">
                  <Phone size={12} /> {job.clientPhone}
                </a>
              )}
            </div>

            {/* Job specs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Briefcase size={15} className="text-slate-400" /> Job Specs
              </h3>
              <dl className="space-y-2 text-sm">
                {[
                  ['Material', job.material],
                  ['Color', job.color],
                  ['Measurements', job.measurements],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="text-slate-400 w-24 flex-shrink-0">{label}</dt>
                    <dd className="font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
              {job.description && (
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 leading-relaxed">{job.description}</p>
              )}
            </div>

            {/* Team assigned */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Team Assigned</h3>
              <div className="space-y-2.5">
                {job.workflowSteps.filter(s => s.assignedUser).map(s => (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {s.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{s.assignedUser!.name}</p>
                      <p className="text-xs text-slate-400">{s.name}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      s.status === 'COMPLETED' ? 'bg-green-400' :
                      s.status === 'IN_PROGRESS' || s.status === 'NOTIFIED' ? 'bg-amber-400' :
                      s.status === 'ISSUE' ? 'bg-red-400' : 'bg-slate-200'
                    }`} />
                  </div>
                ))}
                {job.workflowSteps.filter(s => s.assignedUser).length === 0 && (
                  <p className="text-xs text-slate-400">No workers assigned yet</p>
                )}
              </div>
            </div>

            {/* WhatsApp status */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <MessageSquare size={15} className="text-green-500" /> WhatsApp
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                Twilio integration active
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Workers receive task alerts via WhatsApp and reply DONE / ISSUE / HELP
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
