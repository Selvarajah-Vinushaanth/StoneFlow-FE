'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, Save, Eye, Play,
  Briefcase, User, Calendar, AlertCircle, CheckCircle2, GitBranch,
  GripVertical, ChevronUp, ListChecks,
} from 'lucide-react';
import { jobsApi, usersApi, api, User as UserType } from '@/lib/api';

interface SubTaskForm {
  title: string;
  description: string;
  assignedUserId: string;
  dueAt: string;
}

interface StepForm {
  stepNumber: number;
  name: string;
  description: string;
  assignedUserId: string;
  dueAt: string;
  subTasks: SubTaskForm[];
}

const DEFAULT_STEPS: Omit<StepForm, 'stepNumber'>[] = [
  { name: 'Cutting', description: 'Cut stone to required measurements', assignedUserId: '', dueAt: '', subTasks: [] },
  { name: 'Polishing', description: 'Polish surface to required finish', assignedUserId: '', dueAt: '', subTasks: [] },
  { name: 'Edge Finishing', description: 'Shape and finish all edges', assignedUserId: '', dueAt: '', subTasks: [] },
  { name: 'QC Inspection', description: 'Quality check before packing', assignedUserId: '', dueAt: '', subTasks: [] },
  { name: 'Packing', description: 'Pack securely for delivery', assignedUserId: '', dueAt: '', subTasks: [] },
  { name: 'Installation', description: 'Install at site and upload photos', assignedUserId: '', dueAt: '', subTasks: [] },
];

const MATERIALS = [
  'Black Granite', 'White Granite', 'Grey Granite', 'Red Granite',
  'Carrara Marble', 'Calacatta Marble', 'Grey Marble',
  'White Quartz', 'Grey Quartz', 'Travertine', 'Limestone', 'Sandstone', 'Other',
];

type WizardStep = 'details' | 'workflow' | 'review';

function NewJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<WizardStep>('details');
  const [users, setUsers] = useState<UserType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [templateName, setTemplateName] = useState('');

  // Job form
  const [title, setTitle]               = useState('');
  const [clientName, setClientName]     = useState('');
  const [clientPhone, setClientPhone]   = useState('');
  const [description, setDescription]   = useState('');
  const [measurements, setMeasurements] = useState('');
  const [material, setMaterial]         = useState('');
  const [color, setColor]               = useState('');
  const [startDate, setStartDate]       = useState('');
  const [deadline, setDeadline]         = useState('');
  const [priority, setPriority]         = useState('NORMAL');
  const [notes, setNotes]               = useState('');

  // Steps
  const [steps, setSteps] = useState<StepForm[]>(
    DEFAULT_STEPS.map((s, i) => ({ ...s, stepNumber: i + 1 }))
  );

  useEffect(() => {
    usersApi.list()
      .then(res => setUsers(res.data.data))
      .catch(() => setUsers([]));

    const templateId = searchParams.get('templateId');
    if (templateId) {
      api.get<{ data: { name: string; steps: { stepNumber: number; name: string; description?: string }[] } }>(
        `/workflow-templates/${templateId}`
      ).then(res => {
        const t = res.data.data;
        setTemplateName(t.name);
        setSteps(t.steps.map((s, i) => ({
          stepNumber: i + 1,
          name: s.name,
          description: s.description ?? '',
          assignedUserId: '',
          dueAt: '',
          subTasks: [],
        })));
      }).catch(() => { /* fallback to default steps */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { stepNumber: prev.length + 1, name: '', description: '', assignedUserId: '', dueAt: '', subTasks: [] },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const updateStep = (idx: number, field: keyof Omit<StepForm, 'subTasks'>, value: string) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps(prev => {
      const arr = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
  };

  // Sub-task handlers
  const addSubTask = (stepIdx: number) => {
    setSteps(prev => prev.map((s, i) =>
      i === stepIdx ? { ...s, subTasks: [...s.subTasks, { title: '', description: '', assignedUserId: '', dueAt: '' }] } : s
    ));
  };

  const removeSubTask = (stepIdx: number, subIdx: number) => {
    setSteps(prev => prev.map((s, i) =>
      i === stepIdx ? { ...s, subTasks: s.subTasks.filter((_, j) => j !== subIdx) } : s
    ));
  };

  const updateSubTask = (stepIdx: number, subIdx: number, field: keyof SubTaskForm, value: string) => {
    setSteps(prev => prev.map((s, i) =>
      i === stepIdx
        ? { ...s, subTasks: s.subTasks.map((st, j) => j === subIdx ? { ...st, [field]: value } : st) }
        : s
    ));
  };

  const validateDetails = () => {
    if (!title || !clientName || !deadline) {
      setError('Job title, client name, and deadline are required.'); return false;
    }
    setError(''); return true;
  };

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        title, clientName, clientPhone, description, measurements,
        material, color, startDate: startDate || undefined, deadline, priority, notes,
        steps: steps.filter(s => s.name.trim()).map(s => ({
          ...s,
          assignedUserId: s.assignedUserId || undefined,
          dueAt: s.dueAt || undefined,
          subTasks: s.subTasks.filter(st => st.title.trim()).map((st, i) => ({
            title: st.title,
            description: st.description || undefined,
            assignedUserId: st.assignedUserId || undefined,
            dueAt: st.dueAt || undefined,
            order: i,
          })),
        })),
      };
      const res = await jobsApi.create(payload);
      router.push(`/jobs/${res.data.data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create job. Check backend connection.');
      setSaving(false);
    }
  };

  const wizardSteps: { key: WizardStep; label: string; icon: typeof Briefcase }[] = [
    { key: 'details', label: 'Job Details', icon: Briefcase },
    { key: 'workflow', label: 'Workflow Steps', icon: GitBranch },
    { key: 'review', label: 'Review & Start', icon: CheckCircle2 },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link href="/jobs" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create New Job</h1>
          <p className="text-sm text-slate-500">Fill in details, assign workflow steps, then start</p>
        </div>
      </div>

      <main className="flex-1 min-h-0 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Wizard Progress */}
          <div className="flex items-center mb-8">
            {wizardSteps.map(({ key, label, icon: Icon }, idx) => (
              <div key={key} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === key ? 'text-slate-900 shadow-sm' :
                    wizardSteps.findIndex(s => s.key === step) > idx ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`} style={step === key ? { background: '#f59e0b' } : {}}>
                    {wizardSteps.findIndex(s => s.key === step) > idx ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${step === key ? 'text-amber-700' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < wizardSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${wizardSteps.findIndex(s => s.key === step) > idx ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ─── STEP 1: Details ─── */}
          {step === 'details' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 animate-fade-in">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Briefcase size={18} className="text-amber-500" /> Job Details
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Job Title *</label>
                <input
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Black Granite Kitchen Countertop"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Client Name *</label>
                  <input
                    value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Client Phone</label>
                  <input
                    value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    placeholder="+601XXXXXXXX"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Material</label>
                  <div className="relative">
                    <select
                      value={material} onChange={e => setMaterial(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      <option value="">Select material...</option>
                      {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Color / Finish</label>
                  <input
                    value={color} onChange={e => setColor(e.target.value)}
                    placeholder="e.g. Jet Black, Polished"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Measurements</label>
                <input
                  value={measurements} onChange={e => setMeasurements(e.target.value)}
                  placeholder="e.g. 3200mm x 600mm x 20mm"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date</label>
                  <input
                    type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">Auto-start workflow on this date (if enabled in Settings)</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Deadline *</label>
                  <input
                    type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priority</label>
                  <div className="relative">
                    <select
                      value={priority} onChange={e => setPriority(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      {[['LOW', '🔵 Low'], ['NORMAL', '🟡 Normal'], ['HIGH', '🟠 High'], ['URGENT', '🔴 Urgent']].map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description / Notes</label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Additional job details, special requirements..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { if (validateDetails()) setStep('workflow'); }}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-900 transition-colors"
                  style={{ background: '#f59e0b' }}
                >
                  Next: Workflow Steps →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Workflow ─── */}
          {step === 'workflow' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <GitBranch size={18} className="text-amber-500" /> Workflow Steps
                  {templateName && (
                    <span className="text-xs font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full ml-1">
                      from "{templateName}"
                    </span>
                  )}
                </h2>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {steps.length} steps
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {steps.map((s, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:border-amber-200 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {s.stepNumber}
                      </div>
                      <div className="flex-1">
                        <input
                          value={s.name}
                          onChange={e => updateStep(idx, 'name', e.target.value)}
                          placeholder="Step name (e.g. Cutting)"
                          className="w-full px-2.5 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                          <ChevronDown size={14} />
                        </button>
                        <button onClick={() => removeStep(idx)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-1">
                        <input
                          value={s.description}
                          onChange={e => updateStep(idx, 'description', e.target.value)}
                          placeholder="Step description..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      {s.subTasks.length > 0 ? (
                        <div className="sm:col-span-2 flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-dashed border-amber-200 rounded-lg">
                          <ListChecks size={13} className="text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-amber-700">Worker &amp; due date managed per sub-task below</p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="relative">
                              <select
                                value={s.assignedUserId}
                                onChange={e => updateStep(idx, 'assignedUserId', e.target.value)}
                                className="w-full appearance-none pl-2.5 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                              >
                                <option value="">Assign worker...</option>
                                {users.filter(u => u.isActive).map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.role.replace(/_/g, ' ')})
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <input
                              type="date"
                              value={s.dueAt}
                              onChange={e => updateStep(idx, 'dueAt', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sub-tasks */}
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <ListChecks size={12} className="text-amber-400" /> Sub-tasks
                          {s.subTasks.length > 0 && (
                            <span className="bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 text-xs">{s.subTasks.length}</span>
                          )}
                        </span>
                        <button
                          onClick={() => addSubTask(idx)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <Plus size={11} /> Add Sub-task
                        </button>
                      </div>
                      {s.subTasks.length > 0 && (
                        <div className="space-y-2 pl-2 border-l-2 border-amber-100">
                          {s.subTasks.map((st, subIdx) => (
                            <div key={subIdx} className="border border-slate-100 rounded-xl p-3 bg-white hover:border-amber-200 transition-colors">
                              {/* Sub-task header row: letter badge + name + move + delete */}
                              <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {String.fromCharCode(97 + subIdx)}
                                </div>
                                <input
                                  value={st.title}
                                  onChange={e => updateSubTask(idx, subIdx, 'title', e.target.value)}
                                  placeholder="Sub-task name..."
                                  className="flex-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSteps(prev => prev.map((step, si) => {
                                      if (si !== idx) return step;
                                      const arr = [...step.subTasks];
                                      if (subIdx === 0) return step;
                                      [arr[subIdx], arr[subIdx - 1]] = [arr[subIdx - 1], arr[subIdx]];
                                      return { ...step, subTasks: arr };
                                    }))}
                                    disabled={subIdx === 0}
                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                  >
                                    <ChevronUp size={12} />
                                  </button>
                                  <button
                                    onClick={() => setSteps(prev => prev.map((step, si) => {
                                      if (si !== idx) return step;
                                      const arr = [...step.subTasks];
                                      if (subIdx === arr.length - 1) return step;
                                      [arr[subIdx], arr[subIdx + 1]] = [arr[subIdx + 1], arr[subIdx]];
                                      return { ...step, subTasks: arr };
                                    }))}
                                    disabled={subIdx === s.subTasks.length - 1}
                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                  >
                                    <ChevronDown size={12} />
                                  </button>
                                  <button
                                    onClick={() => removeSubTask(idx, subIdx)}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              {/* Sub-task detail grid: description | assign worker | due date */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <input
                                    value={st.description}
                                    onChange={e => updateSubTask(idx, subIdx, 'description', e.target.value)}
                                    placeholder="Description (optional)"
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                  />
                                </div>
                                <div className="relative">
                                  <select
                                    value={st.assignedUserId}
                                    onChange={e => updateSubTask(idx, subIdx, 'assignedUserId', e.target.value)}
                                    className="w-full appearance-none pl-2.5 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                  >
                                    <option value="">Assign worker...</option>
                                    {users.filter(u => u.isActive).map(u => (
                                      <option key={u.id} value={u.id}>
                                        {u.name} ({u.role.replace(/_/g, ' ')})
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                <div>
                                  <input
                                    type="date"
                                    value={st.dueAt}
                                    onChange={e => updateSubTask(idx, subIdx, 'dueAt', e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addStep}
                className="w-full py-2.5 border-2 border-dashed border-amber-300 rounded-xl text-sm text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Plus size={15} /> Add Step
              </button>

              <div className="flex justify-between pt-5 mt-3 border-t border-slate-100">
                <button
                  onClick={() => setStep('details')}
                  className="px-5 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-900 transition-colors"
                  style={{ background: '#f59e0b' }}
                >
                  Review & Create →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Review ─── */}
          {step === 'review' && (
            <div className="space-y-4 animate-fade-in">
              {/* Job summary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
                  <Eye size={18} className="text-amber-500" /> Review Job
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {[
                    ['Title', title],
                    ['Client', clientName],
                    ['Phone', clientPhone || '—'],
                    ['Material', material || '—'],
                    ['Color', color || '—'],
                    ['Measurements', measurements || '—'],
                    ['Start Date', startDate ? new Date(startDate).toLocaleDateString() : '—'],
                    ['Deadline', deadline ? new Date(deadline).toLocaleDateString() : '—'],
                    ['Priority', priority],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-slate-400 text-xs">{label}</span>
                      <p className="font-medium text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
                {description && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Description</p>
                    <p className="text-sm text-slate-700">{description}</p>
                  </div>
                )}
              </div>

              {/* Workflow summary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <GitBranch size={16} className="text-amber-500" /> Workflow ({steps.filter(s => s.name).length} steps)
                </h3>
                <div className="space-y-2">
                  {steps.filter(s => s.name).map((s, i) => {
                    const assignedUser = users.find(u => u.id === s.assignedUserId);
                    const validSubTasks = s.subTasks.filter(st => st.title.trim());
                    return (
                      <div key={i} className="py-3 border-b border-slate-100 last:border-0">
                        {/* Main step row */}
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                            {s.description && <p className="text-xs text-slate-400">{s.description}</p>}
                          </div>
                          <div className="text-right">
                            {validSubTasks.length > 0 ? (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                                {validSubTasks.length} sub-task{validSubTasks.length !== 1 ? 's' : ''}
                              </span>
                            ) : assignedUser ? (
                              <p className="text-xs font-medium text-slate-700">{assignedUser.name}</p>
                            ) : (
                              <p className="text-xs text-slate-400">Unassigned</p>
                            )}
                            {!validSubTasks.length && s.dueAt && (
                              <p className="text-xs text-slate-400 mt-0.5">{new Date(s.dueAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                        {/* Sub-tasks */}
                        {validSubTasks.length > 0 && (
                          <div className="mt-2 pl-10 space-y-1.5">
                            {validSubTasks.map((st, si) => {
                              const stUser = users.find(u => u.id === st.assignedUserId);
                              return (
                                <div key={si} className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-3 py-2">
                                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                    {String.fromCharCode(97 + si)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-800 truncate">{st.title}</p>
                                    {st.description && <p className="text-xs text-slate-400 truncate">{st.description}</p>}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    {stUser ? (
                                      <p className="text-xs font-medium text-slate-600">{stUser.name}</p>
                                    ) : (
                                      <p className="text-xs text-slate-300">Unassigned</p>
                                    )}
                                    {st.dueAt && (
                                      <p className="text-xs text-slate-400">{new Date(st.dueAt).toLocaleDateString()}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('workflow')}
                  className="px-5 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white"
                >
                  ← Edit Steps
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-900 transition-colors disabled:opacity-60"
                  style={{ background: '#f59e0b' }}
                >
                  {saving ? 'Creating...' : <><Save size={15} /> Create Job</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="flex-1 p-6 text-slate-500">Loading...</div>}>
      <NewJobContent />
    </Suspense>
  );
}
