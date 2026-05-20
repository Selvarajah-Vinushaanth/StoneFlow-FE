'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, Plus, Trash2,
  ChevronDown, ChevronRight, CheckCircle2, Clock, WifiOff, RefreshCw,
  Edit3, Check, X, FileText, AlertCircle, BarChart3, ArrowRight, Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import Header from '@/components/Header';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobExpense {
  id: string;
  jobId: string;
  partName: string;
  partType: string;
  quantity: number;
  amount: number | null;
  pdfStatus: 'PENDING' | 'EXTRACTED' | 'EDITED';
  notes?: string;
  createdAt: string;
}

interface JobWithExpenses {
  id: string;
  jobNumber: string;
  title: string;
  clientName: string;
  status: string;
  createdAt: string;
  expenses: JobExpense[];
}

interface PersonalExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

interface ProfitJob {
  jobId: string;
  jobNumber: string;
  title: string;
  clientName: string;
  status: string;
  createdAt: string;
  totalExpenses: number;
  pendingCount: number;
  revenue: number;
  profit: number;
  margin: number;
  revenueNotes?: string;
}

interface ProfitTotals {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  overallMargin: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `RM ${n.toFixed(2)}`;
}

const PDF_STATUS_CFG = {
  PENDING:   { label: 'Awaiting PDF',  color: 'text-slate-400',  bg: 'bg-slate-100'   },
  EXTRACTED: { label: 'Extracted',     color: 'text-green-700',  bg: 'bg-green-100'   },
  EDITED:    { label: 'Edited',        color: 'text-blue-700',   bg: 'bg-blue-100'    },
} as const;

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'Pending',     color: 'text-slate-500'  },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-600'  },
  PAUSED:      { label: 'Paused',      color: 'text-blue-600'   },
  COMPLETED:   { label: 'Completed',   color: 'text-green-600'  },
  CANCELLED:   { label: 'Cancelled',   color: 'text-red-500'    },
};

const CATEGORIES = ['General', 'Transport', 'Tools', 'Food', 'Fuel', 'Maintenance', 'Office', 'Other'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof DollarSign; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
      <div className="p-3 rounded-xl" style={{ background: color + '15' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Tab: Company Expenses ────────────────────────────────────────────────────

function CompanyExpensesTab() {
  const [jobs, setJobs]           = useState<JobWithExpenses[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [editId, setEditId]       = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [addingTo, setAddingTo]   = useState<string | null>(null);
  const [newPart, setNewPart]     = useState({ partName: '', partType: 'ORI', quantity: 1 });
  const [filter, setFilter]       = useState<'all' | 'pending' | 'completed'>('all');
  const jobRefs                   = useRef<Record<string, HTMLDivElement | null>>({});

  const load = useCallback(async () => {
    setFetchError(false);
    try {
      const r = await api.get<{ success: boolean; data: JobWithExpenses[] }>('/finance/expenses');
      setJobs(r.data.data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) =>
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const jumpToJob = (id: string) => {
    setFilter('all');
    setExpanded(s => new Set(s).add(id));
    setTimeout(() => {
      jobRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleAmountSave = async (expenseId: string) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return;
    try {
      await api.patch(`/finance/expenses/${expenseId}`, { amount, pdfStatus: 'EXTRACTED' });
      await load();
    } catch { /* ignore */ }
    setEditId(null);
    setEditAmount('');
  };

  const handleMarkEdited = async (expenseId: string, currentAmount: number | null) => {
    try {
      await api.patch(`/finance/expenses/${expenseId}`, {
        pdfStatus: 'EDITED',
        amount: currentAmount ?? 0,
      });
      await load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (expenseId: string) => {
    try {
      await api.delete(`/finance/expenses/${expenseId}`);
      await load();
    } catch { /* ignore */ }
  };

  const handleAddPart = async (jobId: string) => {
    if (!newPart.partName.trim()) return;
    try {
      await api.post('/finance/expenses', { ...newPart, jobId, pdfStatus: 'PENDING' });
      setAddingTo(null);
      setNewPart({ partName: '', partType: 'ORI', quantity: 1 });
      await load();
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <WifiOff size={36} className="opacity-40" />
      <p className="text-sm">Could not load expenses — backend may be offline</p>
      <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200">
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );

  const totalExpenses = jobs.reduce((sum, j) =>
    sum + j.expenses.reduce((s, e) => s + (e.amount ?? 0), 0), 0);

  const pendingPDFs = jobs.reduce((sum, j) =>
    sum + j.expenses.filter(e => e.pdfStatus === 'PENDING').length, 0);

  const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
  const verifiedExpenses = completedJobs.reduce((sum, j) =>
    sum + j.expenses.reduce((s, e) => s + (e.amount ?? 0), 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={Receipt}      label="Total Records"    value={String(jobs.length)}
          sub={`${completedJobs.length} completed`} color="#f59e0b" />
        <SummaryCard icon={DollarSign}   label="Total Expenses"   value={fmt(totalExpenses)}
          sub="All records" color="#3b82f6" />
        <SummaryCard icon={CheckCircle2} label="Verified Expenses" value={fmt(verifiedExpenses)}
          sub="Completed records" color="#22c55e" />
      </div>

      {/* Pending alerts — one clickable row per job */}
      {jobs.filter(j => j.expenses.some(e => e.pdfStatus === 'PENDING')).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
            <FileText size={15} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              {pendingPDFs} bank slip{pendingPDFs > 1 ? 's' : ''} awaiting upload — click a job to go there directly
            </p>
          </div>
          <div className="divide-y divide-amber-100">
            {jobs
              .filter(j => j.expenses.some(e => e.pdfStatus === 'PENDING'))
              .map(j => {
                const pendingCount = j.expenses.filter(e => e.pdfStatus === 'PENDING').length;
                return (
                  <button
                    key={j.id}
                    onClick={() => jumpToJob(j.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-100 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-900 truncate">{j.title || j.clientName}</p>
                      <p className="text-xs text-amber-600 font-mono">{j.jobNumber} · {j.clientName}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      {pendingCount} pending
                    </span>
                    <ArrowRight size={14} className="text-amber-500 flex-shrink-0" />
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter size={13} className="text-slate-400" />
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? `All (${jobs.length})` :
             f === 'pending' ? `Needs Attention (${jobs.filter(j => j.expenses.some(e => e.pdfStatus === 'PENDING')).length})` :
             `Completed (${jobs.filter(j => j.status === 'COMPLETED').length})`}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <AlertCircle size={12} />
        Bank slip PDFs are used only for amount extraction and discarded immediately — no file is stored.
      </p>

      {/* Job cards */}
      {jobs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Receipt size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No expense records yet</p>
          <p className="text-xs mt-1">Add parts to jobs to track expenses</p>
        </div>
      ) : (() => {
        const filtered = jobs.filter(j =>
          filter === 'all' ? true :
          filter === 'pending' ? j.expenses.some(e => e.pdfStatus === 'PENDING') :
          j.status === 'COMPLETED'
        );
        if (filtered.length === 0) return (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {filter === 'pending' ? 'No jobs need attention — all bank slips are processed!' : 'No completed jobs yet'}
            </p>
          </div>
        );
        return filtered.map(job => {
          const isOpen = expanded.has(job.id);
          const jobTotal = job.expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
          const processed = job.expenses.filter(e => e.pdfStatus !== 'PENDING').length;
          const statusCfg = STATUS_CFG[job.status] || STATUS_CFG.PENDING;
          const jobPending = job.expenses.filter(e => e.pdfStatus === 'PENDING').length;

          return (
            <div key={job.id} ref={el => { jobRefs.current[job.id] = el; }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Job header */}
              <button
                onClick={() => toggle(job.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                {isOpen ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                        : <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{job.title || job.clientName}</span>
                    <span className="text-xs font-mono text-slate-400">{job.jobNumber}</span>
                    <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                    {jobPending > 0 && (
                      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {jobPending} pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    <span>{job.clientName}</span>
                    <span>{new Date(job.createdAt).toLocaleDateString('en-MY', { day:'2-digit', month:'2-digit', year:'numeric' })}</span>
                    <span>{processed}/{job.expenses.length} PDFs processed</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-800">{jobTotal > 0 ? fmt(jobTotal) : '—'}</p>
                  <p className="text-xs text-slate-400">Total Expenses</p>
                </div>
              </button>

              {/* Expanded expense list */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Part</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">PDF Status</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount (from bank slip)</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {job.expenses.map(exp => {
                        const pdfCfg = PDF_STATUS_CFG[exp.pdfStatus];
                        const isEditing = editId === exp.id;
                        return (
                          <tr key={exp.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3">
                              <p className="font-medium text-slate-800">{exp.partName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                                  exp.partType === 'ORI'   ? 'bg-blue-100 text-blue-700' :
                                  exp.partType === 'OC'    ? 'bg-green-100 text-green-700' :
                                  exp.partType === 'OM'    ? 'bg-purple-100 text-purple-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {exp.partType}
                                </span>
                                <span className="text-xs text-slate-400">× {exp.quantity}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${pdfCfg.bg} ${pdfCfg.color}`}>
                                {pdfCfg.label}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 text-xs">RM</span>
                                  <input
                                    type="number"
                                    value={editAmount}
                                    onChange={e => setEditAmount(e.target.value)}
                                    className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    autoFocus
                                    min="0"
                                    step="0.01"
                                  />
                                  <button onClick={() => handleAmountSave(exp.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded">
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => { setEditId(null); setEditAmount(''); }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold ${exp.amount != null ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {exp.amount != null ? fmt(exp.amount) : '—'}
                                  </span>
                                  {exp.pdfStatus === 'EDITED' && (
                                    <span className="text-xs text-blue-600 font-medium">Edited</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                {exp.pdfStatus === 'PENDING' ? (
                                  <button
                                    onClick={() => { setEditId(exp.id); setEditAmount(String(exp.amount ?? '')); }}
                                    className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
                                  >
                                    Upload PDF
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { setEditId(exp.id); setEditAmount(String(exp.amount ?? '')); }}
                                    className="text-xs px-2.5 py-1 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                                  >
                                    <Edit3 size={11} /> Re-upload
                                  </button>
                                )}
                                {exp.pdfStatus === 'EXTRACTED' && (
                                  <button
                                    onClick={() => handleMarkEdited(exp.id, exp.amount)}
                                    className="text-xs px-2 py-1 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
                                  >
                                    Mark Edited
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(exp.id)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-semibold">
                        <td className="px-5 py-3 text-slate-700">
                          Total — {job.expenses.length} part{job.expenses.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {processed}/{job.expenses.length} bank slips processed
                        </td>
                        <td className="px-3 py-3 text-slate-800">{jobTotal > 0 ? fmt(jobTotal) : 'RM 0.00'}</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setAddingTo(addingTo === job.id ? null : job.id)}
                            className="text-xs px-2.5 py-1 flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-amber-400 hover:text-amber-600"
                          >
                            <Plus size={11} /> Add missed part
                          </button>
                        </td>
                      </tr>
                      {addingTo === job.id && (
                        <tr>
                          <td colSpan={4} className="px-5 py-4 bg-amber-50">
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                placeholder="Part name"
                                value={newPart.partName}
                                onChange={e => setNewPart(p => ({ ...p, partName: e.target.value }))}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 flex-1 min-w-32"
                              />
                              <select
                                value={newPart.partType}
                                onChange={e => setNewPart(p => ({ ...p, partType: e.target.value }))}
                                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                              >
                                <option value="ORI">ORI — Original (genuine brand)</option>
                                <option value="OC">OC — Original Copy (compatible quality)</option>
                                <option value="OM">OM — Original Market (generic/local)</option>
                                <option value="REMAN">REMAN — Remanufactured</option>
                              </select>
                              <input
                                type="number"
                                min="1"
                                value={newPart.quantity}
                                onChange={e => setNewPart(p => ({ ...p, quantity: Number(e.target.value) }))}
                                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                              <span className="text-xs text-slate-500">qty</span>
                              <button
                                onClick={() => handleAddPart(job.id)}
                                className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 font-medium"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setAddingTo(null)}
                                className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>

                  {/* Mark Complete / Reopen */}
                  <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50">
                    <span className="text-xs text-slate-500">
                      {processed}/{job.expenses.length} bank slips processed
                    </span>
                    {job.status !== 'COMPLETED' ? (
                      <button
                        onClick={async () => {
                          try { await api.patch(`/jobs/${job.id}/status`, { status: 'COMPLETED' }); await load(); } catch { /* ignore */ }
                        }}
                        className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >
                        Mark Complete
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          try { await api.patch(`/jobs/${job.id}/status`, { status: 'IN_PROGRESS' }); await load(); } catch { /* ignore */ }
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        });
      })()}
    </div>
  );
}

// ─── Tab: Personal Expenses ───────────────────────────────────────────────────

function PersonalExpensesTab() {
  const [items, setItems]         = useState<PersonalExpense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ description: '', amount: '', category: 'General', date: '', notes: '' });
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editForm, setEditForm]   = useState({ description: '', amount: '', category: 'General' });

  const load = useCallback(async () => {
    setFetchError(false);
    try {
      const r = await api.get<{ success: boolean; data: PersonalExpense[] }>('/finance/personal');
      setItems(r.data.data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      await api.post('/finance/personal', {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date || undefined,
        notes: form.notes || undefined,
      });
      setForm({ description: '', amount: '', category: 'General', date: '', notes: '' });
      setShowAdd(false);
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleEditSave = async (id: string) => {
    if (!editForm.description.trim() || !editForm.amount) return;
    try {
      await api.patch(`/finance/personal/${id}`, {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category,
      });
      setEditId(null);
      await load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/finance/personal/${id}`); await load(); } catch { /* ignore */ }
  };

  const total = items.reduce((s, i) => s + i.amount, 0);
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <WifiOff size={36} className="opacity-40" />
      <p className="text-sm">Could not load — backend may be offline</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={Receipt}  label="Total Personal Spend" value={fmt(total)} sub={`${items.length} records`} color="#8b5cf6" />
        <SummaryCard icon={TrendingDown} label="Largest Expense"
          value={items.length ? fmt(Math.max(...items.map(i => i.amount))) : 'RM 0.00'} color="#ef4444" />
        <SummaryCard icon={DollarSign} label="This Month"
          value={fmt(items.filter(i => new Date(i.date).getMonth() === new Date().getMonth()).reduce((s, i) => s + i.amount, 0))}
          color="#f59e0b" />
      </div>

      {/* Category breakdown */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">By Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(c => byCategory[c] > 0).map(cat => (
              <div key={cat} className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-1.5">
                <span className="text-xs font-medium text-slate-600">{cat}</span>
                <span className="text-xs font-bold text-slate-800">{fmt(byCategory[cat])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-amber-300 shadow-sm p-5">
          <p className="font-semibold text-slate-800 mb-4 text-sm">New Personal Expense</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Description *</label>
              <input type="text" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="e.g. Petrol for delivery" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Amount (RM) *</label>
              <input type="number" value={form.amount} min="0" step="0.01"
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1 font-medium">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white text-sm rounded-xl hover:bg-amber-600 font-medium disabled:opacity-60">
              {saving ? 'Saving…' : 'Add Expense'}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded-xl hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Expense list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">All Personal Expenses</h3>
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
            <Plus size={13} /> Add Expense
          </button>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Receipt size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No personal expenses recorded</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    {editId === item.id ? (
                      <input type="text" value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    ) : (
                      <div>
                        <p className="font-medium text-slate-800">{item.description}</p>
                        {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {editId === item.id ? (
                      <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">{item.category}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-xs">
                    {new Date(item.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {editId === item.id ? (
                      <input type="number" value={editForm.amount} min="0" step="0.01"
                        onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right" />
                    ) : (
                      <span className="font-semibold text-slate-800">{fmt(item.amount)}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {editId === item.id ? (
                        <>
                          <button onClick={() => handleEditSave(item.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
                          <button onClick={() => setEditId(null)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(item.id); setEditForm({ description: item.description, amount: String(item.amount), category: item.category }); }}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => handleDelete(item.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={3} className="px-5 py-3 text-slate-700">Total Personal Spending</td>
                <td className="px-3 py-3 text-right text-slate-800">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Profit Calculator ───────────────────────────────────────────────────

function ProfitCalculatorTab() {
  const [data, setData]         = useState<{ jobs: ProfitJob[]; totals: ProfitTotals } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [revenueEdit, setRevenueEdit] = useState<string | null>(null);
  const [revenueVal, setRevenueVal]   = useState('');
  const [revenueNotes, setRevenueNotes] = useState('');
  const [savingRevenue, setSavingRevenue] = useState(false);

  const load = useCallback(async () => {
    setFetchError(false);
    try {
      const r = await api.get<{ success: boolean; data: { jobs: ProfitJob[]; totals: ProfitTotals } }>('/finance/profit');
      setData(r.data.data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevenueSave = async (jobId: string) => {
    const amount = parseFloat(revenueVal);
    if (isNaN(amount) || amount < 0) return;
    setSavingRevenue(true);
    try {
      await api.post('/finance/revenue', { jobId, amount, notes: revenueNotes || undefined });
      setRevenueEdit(null);
      setRevenueVal('');
      setRevenueNotes('');
      await load();
    } catch { /* ignore */ } finally { setSavingRevenue(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <WifiOff size={36} className="opacity-40" />
      <p className="text-sm">Could not load — backend may be offline</p>
      <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200">
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );

  if (!data) return null;

  const { jobs, totals } = data;
  const profitableJobs = jobs.filter(j => j.profit > 0).length;
  const unprofitableJobs = jobs.filter(j => j.revenue > 0 && j.profit < 0).length;

  return (
    <div className="space-y-5">
      {/* Overall totals */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard icon={TrendingUp}   label="Total Revenue"   value={fmt(totals.totalRevenue)}  color="#22c55e" />
        <SummaryCard icon={TrendingDown} label="Total Expenses"  value={fmt(totals.totalExpenses)} color="#ef4444" />
        <SummaryCard icon={DollarSign}   label="Net Profit"      value={fmt(totals.totalProfit)}
          sub={`${totals.overallMargin.toFixed(1)}% margin`}
          color={totals.totalProfit >= 0 ? '#22c55e' : '#ef4444'} />
        <SummaryCard icon={BarChart3}    label="Profitable Jobs" value={`${profitableJobs} / ${jobs.length}`}
          sub={unprofitableJobs > 0 ? `${unprofitableJobs} at loss` : 'All profitable'} color="#8b5cf6" />
      </div>

      {/* Overall margin bar */}
      {totals.totalRevenue > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Overall Profit Margin</p>
            <span className={`text-sm font-bold ${totals.overallMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.overallMargin.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(Math.abs(totals.overallMargin), 100)}%`,
                background: totals.overallMargin >= 0
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-400">
            <span>Revenue: {fmt(totals.totalRevenue)}</span>
            <span>Expenses: {fmt(totals.totalExpenses)}</span>
          </div>
        </div>
      )}

      {/* Per-job table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Profit by Job</h3>
          <p className="text-xs text-slate-400 mt-0.5">Set revenue per job to calculate profit. Expenses are pulled automatically from bank slips.</p>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No jobs yet — create jobs and add expenses to see profit</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Job</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Revenue</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Expenses</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Profit</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Margin</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map(job => {
                const isEditing = revenueEdit === job.jobId;
                const statusCfg = STATUS_CFG[job.status] || STATUS_CFG.PENDING;
                const hasRevenue = job.revenue > 0;
                const profitColor = !hasRevenue ? 'text-slate-400' : job.profit >= 0 ? 'text-green-600' : 'text-red-600';

                return (
                  <tr key={job.jobId} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{job.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-slate-400">{job.jobNumber}</span>
                        <span className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{job.clientName}</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">RM</span>
                            <input
                              type="number"
                              value={revenueVal}
                              onChange={e => setRevenueVal(e.target.value)}
                              className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
                              autoFocus min="0" step="0.01"
                              placeholder="0.00"
                            />
                          </div>
                          <input
                            type="text"
                            value={revenueNotes}
                            onChange={e => setRevenueNotes(e.target.value)}
                            placeholder="Notes (optional)"
                            className="w-36 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
                          />
                        </div>
                      ) : (
                        <div>
                          <span className={`font-semibold ${hasRevenue ? 'text-slate-800' : 'text-slate-400'}`}>
                            {hasRevenue ? fmt(job.revenue) : 'Not set'}
                          </span>
                          {job.revenueNotes && <p className="text-xs text-slate-400">{job.revenueNotes}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-semibold text-slate-700">
                        {job.totalExpenses > 0 ? fmt(job.totalExpenses) : '—'}
                      </span>
                      {job.pendingCount > 0 && (
                        <p className="text-xs text-orange-500 font-medium mt-0.5">
                          +{job.pendingCount} pending
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-bold ${profitColor}`}>
                        {hasRevenue ? fmt(job.profit) : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {hasRevenue ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-bold ${job.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {job.margin.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(Math.abs(job.margin), 100)}%`,
                                background: job.profit >= 0 ? '#22c55e' : '#ef4444',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRevenueSave(job.jobId)}
                            disabled={savingRevenue}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => { setRevenueEdit(null); setRevenueVal(''); setRevenueNotes(''); }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRevenueEdit(job.jobId);
                            setRevenueVal(job.revenue > 0 ? String(job.revenue) : '');
                            setRevenueNotes(job.revenueNotes ?? '');
                          }}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50"
                        >
                          <Edit3 size={11} />
                          {hasRevenue ? 'Edit Revenue' : 'Set Revenue'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                <td className="px-5 py-3 text-slate-700">Totals</td>
                <td className="px-3 py-3 text-right text-slate-800">{fmt(totals.totalRevenue)}</td>
                <td className="px-3 py-3 text-right text-slate-800">{fmt(totals.totalExpenses)}</td>
                <td className={`px-3 py-3 text-right font-bold ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(totals.totalProfit)}
                </td>
                <td className={`px-3 py-3 text-right text-xs font-bold ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totals.overallMargin.toFixed(1)}%
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FinanceTab = 'expenses' | 'personal' | 'profit';

export default function FinancePage() {
  const [tab, setTab] = useState<FinanceTab>('expenses');

  const tabs: { key: FinanceTab; label: string; icon: typeof Receipt }[] = [
    { key: 'expenses', label: 'Company Expenses',  icon: Receipt     },
    { key: 'personal', label: 'Personal Expenses', icon: DollarSign  },
    { key: 'profit',   label: 'Profit Calculator', icon: TrendingUp  },
  ];

  return (
    <>
      <Header
        title="Finance"
        subtitle="Track company expenses, personal admin spending, and profit per workflow"
      />
      <main className="flex-1 overflow-y-auto" style={{ background: '#f8fafc' }}>
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-center gap-1 mb-6 bg-white border border-slate-200 rounded-2xl p-1 w-fit shadow-sm">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === key
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {tab === 'expenses' && <CompanyExpensesTab />}
          {tab === 'personal' && <PersonalExpensesTab />}
          {tab === 'profit'   && <ProfitCalculatorTab />}
        </div>
      </main>
    </>
  );
}
