'use client';

import { StepStatus } from '@/lib/api';
import { CheckCircle2, Clock, AlertTriangle, HelpCircle, PlayCircle, SkipForward, Bell, Timer, AlarmCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WorkflowStep {
  id: string;
  stepNumber: number;
  name: string;
  description?: string;
  status: StepStatus;
  assignedUser?: { name: string; role: string };
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number | null;
  timerStartedAt?: string | null;
}

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  onCompleteStep?: (stepId: string) => void;
  onSetTimer?: (stepId: string, minutes: number) => void;
  onResetTimer?: (stepId: string) => void;
  onRaiseIssue?: (stepId: string, type: 'ISSUE' | 'HELP', details: string) => void;
  isAdmin?: boolean;
}

const stepConfig: Record<StepStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  WAITING:     { icon: Clock,         color: 'text-slate-400', bg: 'bg-slate-100',   label: 'Waiting' },
  NOTIFIED:    { icon: Bell,          color: 'text-blue-600',  bg: 'bg-blue-100',    label: 'Notified' },
  IN_PROGRESS: { icon: PlayCircle,    color: 'text-amber-600', bg: 'bg-amber-100',   label: 'In Progress' },
  ISSUE:       { icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-100',     label: 'Issue Reported' },
  HELP_NEEDED: { icon: HelpCircle,    color: 'text-orange-600',bg: 'bg-orange-100',  label: 'Help Needed' },
  COMPLETED:   { icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-100',   label: 'Completed' },
  SKIPPED:     { icon: SkipForward,   color: 'text-slate-400', bg: 'bg-slate-100',   label: 'Skipped' },
};

// ─── Live countdown hook ───────────────────────────────────────────────────────
function useCountdown(timerStartedAt: string | null | undefined, durationMinutes: number | null | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!timerStartedAt || !durationMinutes) { setRemaining(null); return; }
    const tick = () => {
      const elapsed = (Date.now() - new Date(timerStartedAt).getTime()) / 1000;
      const total = durationMinutes * 60;
      setRemaining(Math.max(0, total - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStartedAt, durationMinutes]);

  return remaining;
}

function TimerDisplay({ timerStartedAt, durationMinutes, onAlarm }: {
  timerStartedAt: string | null | undefined;
  durationMinutes: number | null | undefined;
  onAlarm?: () => void;
}) {
  const remaining = useCountdown(timerStartedAt, durationMinutes);
  const alarmFired = useRef(false);

  useEffect(() => {
    if (remaining === 0 && !alarmFired.current) {
      alarmFired.current = true;
      onAlarm?.();
    }
    if (remaining !== 0) alarmFired.current = false;
  }, [remaining, onAlarm]);

  if (remaining === null || !durationMinutes) return null;

  const total = durationMinutes * 60;
  const pct = Math.min(100, ((total - remaining) / total) * 100);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const isOverdue = remaining === 0;
  const isWarning = remaining <= 120 && remaining > 0; // last 2 min

  return (
    <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
      isOverdue  ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' :
      isWarning  ? 'bg-orange-50 border-orange-300 text-orange-700' :
                   'bg-slate-50 border-slate-200 text-slate-600'
    }`}>
      {isOverdue ? <AlarmCheck size={13} className="text-red-500" /> : <Timer size={13} />}
      <span>
        {isOverdue ? 'TIME UP! Worker should have finished.' :
          `${mins}m ${secs.toString().padStart(2, '0')}s remaining of ${durationMinutes}m`}
      </span>
      {/* progress bar */}
      <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden ml-1">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${pct}%`,
            background: isOverdue ? '#ef4444' : isWarning ? '#f97316' : '#f59e0b',
          }}
        />
      </div>
    </div>
  );
}

// ─── Timer setter (admin only) ─────────────────────────────────────────────────
function TimerSetter({ step, onSetTimer, onResetTimer }: {
  step: WorkflowStep;
  onSetTimer: (stepId: string, minutes: number) => void;
  onResetTimer: (stepId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const hasTimer = step.timerStartedAt && step.durationMinutes;

  if (!open) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        {hasTimer ? (
          <>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Timer size={11} /> {step.durationMinutes}m timer active
            </span>
            <button
              onClick={() => onResetTimer(step.id)}
              className="text-xs px-2 py-0.5 border border-slate-300 text-slate-500 rounded-lg hover:border-red-400 hover:text-red-600"
            >
              Reset Timer
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="text-xs flex items-center gap-1 px-2 py-0.5 border border-dashed border-slate-300 text-slate-400 rounded-lg hover:border-amber-400 hover:text-amber-600"
          >
            <Timer size={11} /> Set Timer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <Timer size={13} className="text-amber-500" />
      <select
        value={minutes}
        onChange={e => setMinutes(Number(e.target.value))}
        className="border border-slate-300 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        {[1,5,10,15,20,30,45,60,90,120,180,240].map(m => (
          <option key={m} value={m}>{m >= 60 ? `${m/60}h` : `${m}m`}</option>
        ))}
      </select>
      <button
        onClick={() => { onSetTimer(step.id, minutes); setOpen(false); }}
        className="text-xs px-2.5 py-0.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
      >
        Start
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
    </div>
  );
}

// ─── Raise Issue / Help panel (admin only) ────────────────────────────────────
function RaiseIssuePanel({ step, onRaiseIssue }: {
  step: WorkflowStep;
  onRaiseIssue: (stepId: string, type: 'ISSUE' | 'HELP', details: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'ISSUE' | 'HELP'>('ISSUE');
  const [details, setDetails] = useState('');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs flex items-center gap-1 px-2 py-0.5 border border-dashed border-red-300 text-red-400 rounded-lg hover:border-red-500 hover:text-red-600 mt-1.5"
      >
        <AlertTriangle size={11} /> Raise Issue / Help
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => setType('ISSUE')}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${type === 'ISSUE' ? 'bg-red-500 text-white border-red-500' : 'border-red-300 text-red-500 hover:bg-red-100'}`}
        >
          ⚠️ Issue
        </button>
        <button
          onClick={() => setType('HELP')}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${type === 'HELP' ? 'bg-orange-500 text-white border-orange-500' : 'border-orange-300 text-orange-500 hover:bg-orange-100'}`}
        >
          🆘 Help
        </button>
      </div>
      <input
        type="text"
        value={details}
        onChange={e => setDetails(e.target.value)}
        placeholder={type === 'ISSUE' ? 'Describe the issue…' : 'Describe what help is needed…'}
        className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => { onRaiseIssue(step.id, type, details); setOpen(false); setDetails(''); }}
          className="text-xs px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
        >
          Submit
        </button>
        <button onClick={() => { setOpen(false); setDetails(''); }} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancel</button>
      </div>
    </div>
  );
}

export default function WorkflowTimeline({ steps, onCompleteStep, onSetTimer, onResetTimer, onRaiseIssue, isAdmin }: WorkflowTimelineProps) {
  const [alarmStep, setAlarmStep] = useState<string | null>(null);

  return (
    <div className="relative">
      {alarmStep && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm animate-pulse">
          <AlarmCheck size={18} className="text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">Timer Expired!</p>
            <p className="text-red-600 text-xs mt-0.5">
              A worker&apos;s step time is up — check the timeline below and follow up.
            </p>
          </div>
          <button onClick={() => setAlarmStep(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs px-2 py-1">Dismiss</button>
        </div>
      )}

      {steps.map((step, idx) => {
        const cfg = stepConfig[step.status];
        const Icon = cfg.icon;
        const isLast = idx === steps.length - 1;
        const canSetTimer = isAdmin && (step.status === 'IN_PROGRESS' || step.status === 'NOTIFIED' || step.status === 'WAITING');

        return (
          <div key={step.id} className="flex gap-4 group">
            {/* Timeline spine */}
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} border-2 ${step.status === 'COMPLETED' ? 'border-green-300' : step.status === 'IN_PROGRESS' || step.status === 'NOTIFIED' ? 'border-amber-300' : 'border-slate-200'}`}>
                <Icon size={17} className={cfg.color} />
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 mt-1 mb-1 ${step.status === 'COMPLETED' ? 'bg-green-200' : 'bg-slate-200'}`} style={{ minHeight: '28px' }} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Step {step.stepNumber}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 mt-0.5">{step.name}</p>
                  {step.description && (
                    <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>
                  )}
                  {step.assignedUser && (
                    <p className="text-xs text-slate-500 mt-1">
                      Assigned to:{' '}
                      <span className="font-medium text-slate-700">{step.assignedUser.name}</span>
                      <span className="ml-1 text-slate-400">({step.assignedUser.role.replace(/_/g, ' ')})</span>
                    </p>
                  )}
                  {step.completedAt && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Completed: {new Date(step.completedAt).toLocaleString()}
                    </p>
                  )}
                  {step.startedAt && !step.completedAt && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Started: {new Date(step.startedAt).toLocaleString()}
                    </p>
                  )}

                  {/* Live timer display */}
                  <TimerDisplay
                    timerStartedAt={step.timerStartedAt}
                    durationMinutes={step.durationMinutes}
                    onAlarm={() => setAlarmStep(step.id)}
                  />

                  {/* Admin timer setter */}
                  {canSetTimer && onSetTimer && onResetTimer && (
                    <TimerSetter step={step} onSetTimer={onSetTimer} onResetTimer={onResetTimer} />
                  )}

                  {/* Admin raise issue / help */}
                  {isAdmin && onRaiseIssue && (step.status === 'IN_PROGRESS' || step.status === 'NOTIFIED') && (
                    <RaiseIssuePanel step={step} onRaiseIssue={onRaiseIssue} />
                  )}
                </div>
                {isAdmin && (step.status === 'IN_PROGRESS' || step.status === 'NOTIFIED') && onCompleteStep && (
                  <button
                    onClick={() => onCompleteStep(step.id)}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex-shrink-0"
                  >
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

