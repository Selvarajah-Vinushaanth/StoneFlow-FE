'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, Plus, Search, Filter, Calendar, ArrowRight, ChevronDown,
  CheckCircle2, Clock, PlayCircle, AlertTriangle, Trash2, MoreVertical, WifiOff, RefreshCw, FolderKanban,
} from 'lucide-react';
import { jobsApi, Job, JobStatus, Priority } from '@/lib/api';
import Header from '@/components/Header';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import Pagination from '@/components/Pagination';

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const color = pct === 100 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#94a3b8';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-500 w-12 text-right">{value}/{total}</span>
    </div>
  );
}

function JobsContent() {
  const searchParams = useSearchParams();
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [page, setPage]           = useState(1);

  const load = useCallback(async () => {
    setFetchError(false);
    try {
      const params: Record<string, string> = {};
      // Always fetch all jobs so every tab's count stays accurate
      if (search) params.search = search;
      const res = await jobsApi.list(params);
      setJobs(res.data.data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter, priorityFilter, search]);

  const handleDelete = async (id: string) => {
    try {
      await jobsApi.delete(id);
    } catch {
      // delete already removed from DB; refresh list
    }
    setJobs(prev => prev.filter(j => j.id !== id));
    setDeleteId(null);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (j: Job) =>
    new Date(j.deadline) < today && j.status !== 'COMPLETED' && j.status !== 'CANCELLED';

  const isUpcoming = (j: Job) =>
    j.status === 'PENDING' && new Date(j.deadline) >= today;

  const filtered = jobs.filter(j => {
    const matchStatus =
      statusFilter === 'ALL'      ? true :
      statusFilter === 'OVERDUE'  ? isOverdue(j) :
      statusFilter === 'UPCOMING' ? isUpcoming(j) :
      j.status === statusFilter;
    const matchPriority = priorityFilter === 'ALL' || j.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusCounts = {
    ALL:         jobs.length,
    PENDING:     jobs.filter(j => j.status === 'PENDING').length,
    IN_PROGRESS: jobs.filter(j => j.status === 'IN_PROGRESS').length,
    COMPLETED:   jobs.filter(j => j.status === 'COMPLETED').length,
    UPCOMING:    jobs.filter(isUpcoming).length,
    OVERDUE:     jobs.filter(isOverdue).length,
  };

  return (
    <>
      <Header
        title="Jobs"
        subtitle={`${jobs.length} total jobs`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              title="Refresh"
              className="p-2 rounded-lg text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={15} />
            </button>
            <Link
              href="/jobs/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-900 transition-colors"
              style={{ background: '#f59e0b' }}
            >
              <Plus size={15} /> New Job
            </Link>
          </div>
        }
      />

      <main className="flex-1 p-6 overflow-y-auto" style={{ background: '#f8fafc' }}>
        {fetchError && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
            <WifiOff size={16} className="flex-shrink-0" />
            <span>Cannot connect to backend. Make sure the server is running on port 4000.</span>
            <button onClick={load} className="ml-auto text-red-600 hover:underline font-semibold">Retry</button>
          </div>
        )}
        {/* Status Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'ALL',         label: 'All',       icon: Briefcase },
            { key: 'PENDING',     label: 'Pending',   icon: Clock },
            { key: 'IN_PROGRESS', label: 'Active',    icon: PlayCircle },
            { key: 'COMPLETED',   label: 'Completed', icon: CheckCircle2 },
            { key: 'UPCOMING',    label: 'Upcoming',  icon: Calendar },
            { key: 'OVERDUE',     label: 'Overdue',   icon: AlertTriangle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
                statusFilter === key
                  ? 'text-slate-900 shadow-md'
                  : 'bg-white border border-slate-200/80 text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
              style={statusFilter === key ? { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' } : {}}
            >
              <Icon size={13} />
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${statusFilter === key ? 'bg-amber-600/30 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                {statusCounts[key as keyof typeof statusCounts]}
              </span>
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs, clients..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200/80 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-slate-200/80 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            >
              <option value="ALL">All Priority</option>
              {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as Priority[]).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Jobs Table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-200/80 shadow-sm" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium mb-1">No jobs found</p>
            <Link href="/jobs/new" className="text-amber-600 text-sm hover:underline font-semibold">+ Create your first job</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest" style={{ background: '#f8fafc' }}>
              <div className="col-span-4">Job</div>
              <div className="col-span-2">Client</div>
              <div className="col-span-2">Progress</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Deadline</div>
              <div className="col-span-1"></div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-50">
              {paginated.map(job => (
                <div key={job.id} className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-amber-50/30 transition-colors items-center group">
                  {/* Job info */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200/60 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={14} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/jobs/${job.id}`} className="font-bold text-slate-800 text-sm hover:text-amber-700 truncate block transition-colors">
                        {job.title}
                      </Link>
                      <p className="text-xs text-slate-400">{job.jobNumber} · {job.material || '—'}</p>
                      {job.project && (
                        <Link
                          href={`/projects/${job.project.id}`}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-violet-50 border border-violet-100 text-violet-600 text-[10px] font-medium hover:bg-violet-100 transition-colors max-w-full"
                        >
                          <FolderKanban size={9} className="flex-shrink-0" />
                          <span className="truncate">{job.project.name}</span>
                          {job.levelName && <span className="text-violet-400 flex-shrink-0">· {job.levelName}</span>}
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Client */}
                  <div className="col-span-2">
                    <p className="text-sm text-slate-700 font-semibold truncate">{job.clientName}</p>
                    {job.clientPhone && <p className="text-xs text-slate-400">{job.clientPhone}</p>}
                  </div>

                  {/* Progress */}
                  <div className="col-span-2">
                    <ProgressBar value={job.completedSteps} total={job.totalSteps} />
                  </div>

                  {/* Priority */}
                  <div className="col-span-1">
                    <PriorityBadge priority={job.priority} />
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                    <StatusBadge status={job.status} />
                  </div>

                  {/* Deadline */}
                  <div className="col-span-1">
                    <p className="text-xs font-bold text-slate-700">{new Date(job.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    {new Date(job.deadline) < new Date() && job.status !== 'COMPLETED' && (
                      <p className="text-[10px] text-red-500 font-bold mt-0.5">Overdue!</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                      title="View"
                    >
                      <ArrowRight size={14} />
                    </Link>
                    <button
                      onClick={() => setDeleteId(job.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} className="border-t border-slate-100" />
          </div>
        )}
      </main>

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 text-center mb-1 text-lg">Delete Job?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">This will delete all workflow steps and logs. Cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="flex-1 p-6 text-slate-500">Loading...</div>}>
      <JobsContent />
    </Suspense>
  );
}
