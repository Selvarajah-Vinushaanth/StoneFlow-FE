'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Edit2, Play, Layers, ExternalLink,
  X, CheckCircle2, RefreshCw, MapPin, Calendar, User, Phone,
} from 'lucide-react';
import { projectsApi, Project, ProjectLevel, Job, JobStatus, ProjectStatus } from '@/lib/api';

// ─── Status helpers ───────────────────────────────────────────────────────────

const PROJECT_STATUS: Record<ProjectStatus, { label: string; dot: string; bg: string; text: string }> = {
  PLANNING:  { label: 'Planning',  dot: 'bg-slate-400',  bg: 'bg-slate-100',  text: 'text-slate-600' },
  ACTIVE:    { label: 'Active',    dot: 'bg-green-500',  bg: 'bg-green-100',  text: 'text-green-700' },
  ON_HOLD:   { label: 'On Hold',   dot: 'bg-amber-500',  bg: 'bg-amber-100',  text: 'text-amber-700' },
  COMPLETED: { label: 'Completed', dot: 'bg-blue-500',   bg: 'bg-blue-100',   text: 'text-blue-700'  },
  CANCELLED: { label: 'Cancelled', dot: 'bg-red-400',    bg: 'bg-red-100',    text: 'text-red-600'   },
};

const JOB_STATUS: Record<JobStatus, { dot: string }> = {
  PENDING:     { dot: 'bg-slate-300' },
  IN_PROGRESS: { dot: 'bg-blue-400'  },
  PAUSED:      { dot: 'bg-amber-400' },
  COMPLETED:   { dot: 'bg-green-500' },
  CANCELLED:   { dot: 'bg-red-400'   },
};

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({
  title,
  message,
  onClose,
  onConfirm,
  loading,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-red-500" />
            <h2 className="font-bold text-slate-800 text-base">{title}</h2>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UnitCard({ job }: { job: Job }) {
  const pct = job.totalSteps > 0 ? Math.round((job.completedSteps / job.totalSteps) * 100) : 0;
  const { dot } = JOB_STATUS[job.status] ?? JOB_STATUS.PENDING;
  const barColor = job.status === 'COMPLETED' ? '#22c55e' : '#7c3aed';
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-semibold text-xs text-slate-800 leading-tight line-clamp-2">
          {job.unitNumber ?? job.title}
        </p>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${dot}`} />
      </div>
      <p className="text-[10px] text-slate-400 truncate">{job.jobNumber}</p>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
        <span className="text-[10px] text-slate-400 w-6 text-right">{pct}%</span>
      </div>
    </Link>
  );
}

function AddUnitTile({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1.5 p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all text-slate-400 hover:text-violet-500 min-h-[80px]"
    >
      <Plus size={16} />
      <span className="text-xs font-medium">Add Unit</span>
    </Link>
  );
}

function TrackingRow({ job }: { job: Job }) {
  const pct = job.totalSteps > 0 ? Math.round((job.completedSteps / job.totalSteps) * 100) : 0;
  const { dot } = JOB_STATUS[job.status] ?? JOB_STATUS.PENDING;
  const currentStep = job.workflowSteps?.find(s => s.status === 'IN_PROGRESS');
  const barColor = job.status === 'COMPLETED' ? '#22c55e' : '#7c3aed';
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-100 rounded-xl hover:border-violet-200 transition-colors group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <div className="w-28 flex-shrink-0">
        <p className="font-medium text-xs text-slate-800 truncate">{job.unitNumber ?? job.title}</p>
        <p className="text-[10px] text-slate-400">{job.jobNumber}</p>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
        <span className="text-xs text-slate-400 w-8 text-right flex-shrink-0">{pct}%</span>
      </div>
      <div className="w-36 flex-shrink-0 hidden sm:block">
        {job.status === 'COMPLETED' ? (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={11} /> Done
          </span>
        ) : currentStep ? (
          <span className="text-xs text-slate-500 truncate block">→ {currentStep.name}</span>
        ) : (
          <span className="text-xs text-slate-400">Not started</span>
        )}
      </div>
      <div className="w-24 flex-shrink-0 hidden md:block text-xs text-slate-500 truncate">
        {currentStep?.assignedUser?.name ?? ''}
      </div>
      <Link href={`/jobs/${job.id}`} className="text-slate-300 hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100">
        <ExternalLink size={12} />
      </Link>
    </div>
  );
}

// ─── Start modal ──────────────────────────────────────────────────────────────

function StartModal({
  project, levels, onClose, onConfirm, starting,
}: {
  project: Project;
  levels: ProjectLevel[];
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  starting: boolean;
}) {
  const allPending = levels.flatMap(l =>
    l.jobs.filter(j => j.status === 'PENDING' && j.totalSteps > 0)
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allPending.map(j => j.id)));

  const toggle = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleLevel = (jobs: Job[]) => {
    const ids = jobs.map(j => j.id);
    const allOn = ids.every(id => selected.has(id));
    setSelected(prev => {
      const s = new Set(prev);
      ids.forEach(id => allOn ? s.delete(id) : s.add(id));
      return s;
    });
  };

  const selectAll = () => setSelected(new Set(allPending.map(j => j.id)));
  const selectNone = () => setSelected(new Set());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Play size={16} className="text-violet-600" />
            <h2 className="font-bold text-slate-800">Start Project</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-base font-semibold text-slate-800 mb-1">{project.name}</p>

          {allPending.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              All units are already started or have no workflow steps configured.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">
                  <strong className="text-slate-700">{selected.size}</strong> of{' '}
                  <strong className="text-slate-700">{allPending.length}</strong> units selected
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className="text-xs text-violet-600 hover:underline font-medium">All</button>
                  <span className="text-slate-300">·</span>
                  <button onClick={selectNone} className="text-xs text-slate-400 hover:underline font-medium">None</button>
                </div>
              </div>

              <div className="space-y-3">
                {levels.map(level => {
                  const pending = level.jobs.filter(j => j.status === 'PENDING' && j.totalSteps > 0);
                  if (pending.length === 0) return null;
                  const allLevelOn = pending.every(j => selected.has(j.id));
                  const someLevelOn = pending.some(j => selected.has(j.id));
                  return (
                    <div key={level.id} className="border border-slate-100 rounded-xl overflow-hidden">
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => toggleLevel(pending)}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          allLevelOn ? 'bg-violet-500 border-violet-500' : someLevelOn ? 'bg-violet-200 border-violet-400' : 'border-slate-300'
                        }`}>
                          {(allLevelOn || someLevelOn) && <CheckCircle2 size={10} className="text-white" />}
                        </div>
                        <Layers size={13} className="text-violet-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-slate-700 flex-1">{level.name}</span>
                        <span className="text-xs text-slate-400">{pending.filter(j => selected.has(j.id)).length}/{pending.length}</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {pending.map(job => (
                          <label
                            key={job.id}
                            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-violet-50/50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(job.id)}
                              onChange={() => toggle(job.id)}
                              className="w-3.5 h-3.5 rounded accent-violet-500 flex-shrink-0"
                            />
                            <span className="text-sm text-slate-700 font-medium flex-1 truncate">
                              {job.unitNumber ?? job.title}
                            </span>
                            <span className="text-xs text-slate-400">{job.totalSteps} step{job.totalSteps !== 1 ? 's' : ''}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} disabled={starting} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={starting || selected.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90"
            style={{ background: '#7c3aed' }}
          >
            {starting ? (
              <><RefreshCw size={14} className="animate-spin" /> Starting…</>
            ) : (
              <><CheckCircle2 size={14} /> Start {selected.size} Job{selected.size !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type DeleteTarget =
  | { type: 'project' }
  | { type: 'level'; levelId: string; unitCount: number };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'structure' | 'tracking'>('structure');
  const [newLevelName, setNewLevelName] = useState('');
  const [addingLevel, setAddingLevel] = useState(false);
  const [editingLevel, setEditingLevel] = useState<{ id: string; name: string } | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startMsg, setStartMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const levelInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await projectsApi.get(id);
      setProject(res.data.data);
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const levels = project?.levels ?? [];
  const totalUnits = levels.reduce((s, l) => s + l.jobs.length, 0);
  const completedUnits = levels.reduce((s, l) => s + l.jobs.filter(j => j.status === 'COMPLETED').length, 0);
  const pendingUnits = levels.reduce((s, l) => s + l.jobs.filter(j => j.status === 'PENDING' && j.totalSteps > 0).length, 0);
  const overallPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  async function addLevel() {
    if (!newLevelName.trim() || !project) return;
    setAddingLevel(true);
    try {
      const res = await projectsApi.addLevel(project.id, newLevelName);
      setProject(p => p ? { ...p, levels: [...(p.levels ?? []), res.data.data] } : p);
      setNewLevelName('');
      levelInputRef.current?.focus();
    } catch { /* ignore */ }
    setAddingLevel(false);
  }

  async function saveEditLevel() {
    if (!editingLevel || !project) return;
    if (!editingLevel.name.trim()) { setEditingLevel(null); return; }
    try {
      const res = await projectsApi.updateLevel(project.id, editingLevel.id, { name: editingLevel.name });
      setProject(p => p ? {
        ...p,
        levels: (p.levels ?? []).map(l => l.id === editingLevel.id ? res.data.data : l),
      } : p);
    } catch { /* ignore */ }
    setEditingLevel(null);
  }

  async function handleStartProject(selectedIds: string[]) {
    if (!project) return;
    setStarting(true);
    try {
      const res = await projectsApi.start(project.id, selectedIds);
      const { started } = res.data.data;
      setStartMsg(`Started ${started} job${started !== 1 ? 's' : ''} successfully!`);
      await load();
      setShowStartModal(false);
      setTab('tracking');
      setTimeout(() => setStartMsg(''), 5000);
    } catch { /* ignore */ }
    setStarting(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !project) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'project') {
        await projectsApi.delete(project.id);
        router.push('/projects');
      } else {
        await projectsApi.deleteLevel(project.id, deleteTarget.levelId);
        setProject(p => p ? { ...p, levels: (p.levels ?? []).filter(l => l.id !== deleteTarget.levelId) } : p);
        setDeleteTarget(null);
      }
    } catch { /* ignore */ }
    setDeleting(false);
  }

  if (loading) {
    return (
      <main className="flex-1 p-6 overflow-y-auto flex items-center justify-center text-slate-400" style={{ background: '#f8fafc' }}>
        <RefreshCw size={18} className="animate-spin mr-2" /> Loading project…
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex-1 p-6 overflow-y-auto text-center py-16" style={{ background: '#f8fafc' }}>
        <p className="text-slate-500 mb-4">Project not found.</p>
        <Link href="/projects" className="text-violet-600 hover:underline text-sm">← Back to Projects</Link>
      </main>
    );
  }

  const ps = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.PLANNING;

  const addUnitHref = (level: ProjectLevel) => {
    const params = new URLSearchParams({
      projectId: project.id,
      levelId: level.id,
      levelName: level.name,
      clientName: project.clientName,
      ...(project.clientPhone ? { clientPhone: project.clientPhone } : {}),
    });
    return `/jobs/new?${params.toString()}`;
  };

  const deleteModalProps = deleteTarget
    ? deleteTarget.type === 'project'
      ? {
          title: 'Delete Project',
          message: `Delete "${project.name}" and all its levels and units? This cannot be undone.`,
        }
      : {
          title: 'Delete Level',
          message: deleteTarget.unitCount > 0
            ? `Delete this level and its ${deleteTarget.unitCount} unit${deleteTarget.unitCount !== 1 ? 's' : ''}? This cannot be undone.`
            : 'Delete this level? This cannot be undone.',
        }
    : null;

  return (
    <>
      <main className="flex-1 p-6 overflow-y-auto space-y-4" style={{ background: '#f8fafc' }}>
        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Link href="/projects" className="mt-1 text-slate-400 hover:text-violet-500 flex-shrink-0 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
                  <span className="text-xs text-slate-400 font-mono">{project.projectNumber}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ps.bg} ${ps.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                    {ps.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><User size={11} /> {project.clientName}</span>
                  {project.clientPhone && <span className="flex items-center gap-1"><Phone size={11} /> {project.clientPhone}</span>}
                  {project.location && <span className="flex items-center gap-1"><MapPin size={11} /> {project.location}</span>}
                  {project.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Deadline: {new Date(project.deadline).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {pendingUnits > 0 && (
                <button
                  onClick={() => setShowStartModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: '#7c3aed' }}
                >
                  <Play size={14} /> Start Project
                </button>
              )}
              {project.status === 'ACTIVE' && pendingUnits === 0 && (
                <button
                  onClick={() => setTab('tracking')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  Live Tracking
                </button>
              )}
              <button
                onClick={() => setDeleteTarget({ type: 'project' })}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500 transition-colors"
                title="Delete project"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {project.description && (
            <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Success toast */}
        {startMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
            <CheckCircle2 size={15} /> {startMsg}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Levels', value: String(levels.length),           sub: 'project levels'   },
            { label: 'Total Units', value: String(totalUnits),         sub: 'work units'       },
            { label: 'Completed', value: `${completedUnits}/${totalUnits}`, sub: `${overallPct}% done` },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{c.value}</p>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">{c.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Tab panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100 px-6">
            {(['structure', 'tracking'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3.5 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t === 'structure' ? 'Structure' : 'Live Tracking'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Structure tab */}
            {tab === 'structure' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    ref={levelInputRef}
                    value={newLevelName}
                    onChange={e => setNewLevelName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addLevel()}
                    placeholder="Level name (e.g. Level 1, Ground Floor, Block A…)"
                    className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 placeholder-slate-400"
                  />
                  <button
                    onClick={addLevel}
                    disabled={addingLevel || !newLevelName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                    style={{ background: '#7c3aed' }}
                  >
                    <Plus size={14} /> {addingLevel ? 'Adding…' : 'Add Level'}
                  </button>
                </div>

                {levels.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Layers size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No levels yet</p>
                    <p className="text-xs mt-1">Type a level name above and press Enter or click Add Level.</p>
                  </div>
                )}

                {levels.map(level => (
                  <div key={level.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Level header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <Layers size={14} className="text-violet-400 flex-shrink-0" />
                      {editingLevel?.id === level.id ? (
                        <input
                          value={editingLevel.name}
                          onChange={e => setEditingLevel({ ...editingLevel, name: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEditLevel();
                            if (e.key === 'Escape') setEditingLevel(null);
                          }}
                          onBlur={saveEditLevel}
                          autoFocus
                          className="flex-1 px-2 py-0.5 border border-violet-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-violet-400"
                        />
                      ) : (
                        <span className="flex-1 font-semibold text-sm text-slate-800">{level.name}</span>
                      )}
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {level.jobs.length} unit{level.jobs.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditingLevel(editingLevel?.id === level.id ? null : { id: level.id, name: level.name })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors"
                          title="Rename level"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'level', levelId: level.id, unitCount: level.jobs.length })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete level"
                        >
                          <Trash2 size={13} />
                        </button>
                        <Link
                          href={addUnitHref(level)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 ml-1 transition-colors"
                        >
                          <Plus size={12} /> Add Unit
                        </Link>
                      </div>
                    </div>

                    {/* Units grid */}
                    <div className="p-3">
                      {level.jobs.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                          No units yet.{' '}
                          <Link href={addUnitHref(level)} className="text-violet-500 hover:underline">Add the first unit →</Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                          {level.jobs.map(job => <UnitCard key={job.id} job={job} />)}
                          <AddUnitTile href={addUnitHref(level)} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tracking tab */}
            {tab === 'tracking' && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${overallPct}%`, backgroundColor: overallPct === 100 ? '#22c55e' : '#7c3aed' }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700 flex-shrink-0">
                    {completedUnits}/{totalUnits} done ({overallPct}%)
                  </span>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  </button>
                </div>

                {totalUnits === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    No units to track yet. Switch to Structure and add units under each level.
                  </div>
                )}

                {levels.map(level => {
                  const done = level.jobs.filter(j => j.status === 'COMPLETED').length;
                  if (level.jobs.length === 0) return null;
                  return (
                    <div key={level.id}>
                      <div className="flex items-center gap-3 mb-2">
                        <Layers size={13} className="text-violet-400" />
                        <span className="font-semibold text-sm text-slate-700">{level.name}</span>
                        <span className="text-xs text-slate-400">{done}/{level.jobs.length} complete</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <div className="space-y-1.5 pl-1">
                        {level.jobs.map(job => <TrackingRow key={job.id} job={job} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Start modal */}
      {showStartModal && (
        <StartModal
          project={project}
          levels={levels}
          onClose={() => !starting && setShowStartModal(false)}
          onConfirm={handleStartProject}
          starting={starting}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && deleteModalProps && (
        <ConfirmDeleteModal
          title={deleteModalProps.title}
          message={deleteModalProps.message}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          loading={deleting}
        />
      )}
    </>
  );
}
