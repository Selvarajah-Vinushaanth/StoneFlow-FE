'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';
import { FolderKanban, Save, Building2, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PLANNING');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !clientName.trim()) {
      setError('Project name and client name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await projectsApi.create({
        name: name.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        status,
        startDate: startDate || undefined,
        deadline: deadline || undefined,
        notes: notes.trim() || undefined,
      });
      router.push(`/projects/${res.data.data.id}`);
    } catch {
      setError('Failed to create project. Please try again.');
      setSaving(false);
    }
  }

  return (
    <>
      <Header
        title="New Project"
        subtitle="Create a multi-level project (e.g. Menara Residence KL)"
        action={
          <Link
            href="/projects"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        }
      />

      <main className="flex-1 p-6 overflow-y-auto" style={{ background: '#f8fafc' }}>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Building2 size={16} className="text-violet-500" /> Project Details
            </h2>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Project Name *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Menara Residence KL"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Client Name *</label>
                <input
                  value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="Developer / Client"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Client Phone</label>
                <input
                  value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  placeholder="+601x-xxxxxxx"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location / Site Address</label>
              <input
                value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Jalan Ampang, Kuala Lumpur"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select
                value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date</label>
                <input
                  type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Completion</label>
                <input
                  type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Project overview, scope of work..."
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Internal Notes</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any internal notes..."
                rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/projects"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ background: '#7c3aed' }}
            >
              <FolderKanban size={15} />
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
