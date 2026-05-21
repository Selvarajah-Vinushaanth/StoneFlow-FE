'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  UserPlus, Trash2, Phone, Mail, Shield, Globe, ToggleLeft, ToggleRight,
  Search, X, ChevronDown, Users, Edit2, Check, Briefcase, WifiOff, RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { usersApi, whatsappApi, User, Role, Language } from '@/lib/api';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import { RoleBadge } from '@/components/Badges';

const ROLES: Role[] = [
  'ADMIN', 'MANAGER', 'SALESMAN', 'SITE_SUPERVISOR',
  'CUTTER', 'POLISHER', 'EDGE_FINISHER',
  'PACKER', 'LOADER', 'INSTALLER', 'QC_INSPECTOR', 'DRIVER', 'WORKER',
];

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: 'ENGLISH',      label: 'English',        flag: '🇬🇧' },
  { value: 'BANGLA',       label: 'Bangla',          flag: '🇧🇩' },
  { value: 'MANDARIN',     label: 'Mandarin',        flag: '🇨🇳' },
  { value: 'BAHASA_MALAY', label: 'Bahasa Malaysia', flag: '🇲🇾' },
  { value: 'TAMIL',        label: 'Tamil',           flag: '🇮🇳' },
];

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  MANAGER: 'bg-purple-100 text-purple-700',
  SALESMAN: 'bg-emerald-100 text-emerald-700',
  SITE_SUPERVISOR: 'bg-violet-100 text-violet-700',
  CUTTER: 'bg-blue-100 text-blue-700',
  POLISHER: 'bg-cyan-100 text-cyan-700',
  EDGE_FINISHER: 'bg-indigo-100 text-indigo-700',
  PACKER: 'bg-orange-100 text-orange-700',
  LOADER: 'bg-yellow-100 text-yellow-700',
  INSTALLER: 'bg-green-100 text-green-700',
  QC_INSPECTOR: 'bg-teal-100 text-teal-700',
  DRIVER: 'bg-pink-100 text-pink-700',
  WORKER: 'bg-slate-100 text-slate-700',
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  const colors = [
    'bg-amber-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400',
    'bg-pink-400', 'bg-teal-400', 'bg-orange-400', 'bg-red-400',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

interface UserFormData {
  name: string;
  phone: string;
  email: string;
  role: Role;
  language: Language;
}

const emptyForm: UserFormData = {
  name: '', phone: '', email: '', role: 'WORKER', language: 'ENGLISH',
};

export default function UsersPage() {
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser]   = useState<User | null>(null);
  const [form, setForm]           = useState<UserFormData>(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [viewUser, setViewUser]   = useState<User | null>(null);
  const [page, setPage]           = useState(1);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toast, setToast]         = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const showToast = (kind: 'success' | 'error', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 6000);
  };

  const handleTestWhatsApp = async (u: User) => {
    setTestingId(u.id);
    try {
      const res = await whatsappApi.test({ userId: u.id });
      const d = res.data.delivery;
      if (d.status === 'sent') {
        showToast('success', `WhatsApp test sent to ${u.name} (${d.to}). SID: ${d.sid}`);
      } else if (d.status === 'demo_sent') {
        showToast('error', `Demo mode: ${d.errorMessage ?? 'Twilio credentials missing.'}`);
      } else {
        showToast('error', `Failed (code ${d.errorCode ?? 'n/a'}): ${d.errorMessage ?? 'Unknown error'}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Test request failed. Is the backend running?');
    } finally {
      setTestingId(null);
    }
  };

  const load = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await usersApi.list();
      setUsers(res.data.data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filterRole]);

  const openCreate = () => { setEditUser(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit   = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, phone: u.phone, email: u.email || '', role: u.role, language: u.language });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.role) { setError('Name, phone and role are required.'); return; }
    setSaving(true); setError('');
    try {
      if (editUser) {
        const res = await usersApi.update(editUser.id, form);
        setUsers(prev => prev.map(u => u.id === editUser.id ? res.data.data : u));
      } else {
        const res = await usersApi.create(form);
        setUsers(prev => [res.data.data, ...prev]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Save failed. Check backend connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await usersApi.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch {
      alert('Delete failed. Backend may be offline.');
    }
    setDeleteId(null);
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await usersApi.toggle(id);
      setUsers(prev => prev.map(u => u.id === id ? res.data.data : u));
    } catch {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) || (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const PAGE_SIZE = 6;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const langMap = Object.fromEntries(LANGUAGES.map(l => [l.value, l]));

  return (
    <>
      <Header
        title="Team Management"
        subtitle={`${users.length} team members`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              title="Refresh"
              className="p-2 rounded-lg text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-900 transition-colors"
              style={{ background: '#f59e0b' }}
            >
              <UserPlus size={15} /> Add Member
            </button>
          </div>
        }
      />

      <main className="flex-1 p-6 overflow-y-auto">
        {fetchError && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <WifiOff size={16} className="flex-shrink-0" />
            <span>Cannot connect to backend. Make sure the server is running on port 4000.</span>
            <button onClick={load} className="ml-auto text-red-600 hover:underline font-medium">Retry</button>
          </div>
        )}
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="relative">
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ALL">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Total Members', value: users.length, color: 'text-slate-700' },
            { label: 'Active', value: users.filter(u => u.isActive).length, color: 'text-green-600' },
            { label: 'Inactive', value: users.filter(u => !u.isActive).length, color: 'text-red-500' },
            { label: 'Roles Used', value: new Set(users.map(u => u.role)).size, color: 'text-purple-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Users Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No members found</p>
            <button onClick={openCreate} className="mt-3 text-amber-600 text-sm hover:underline">+ Add first member</button>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(user => (
              <div
                key={user.id}
                className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all ${
                  user.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarColor(user.name)}`}>
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                        {!user.isActive && <span className="text-xs text-red-500 font-medium">(Inactive)</span>}
                      </div>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${roleColors[user.role] || 'bg-slate-100 text-slate-600'}`}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTestWhatsApp(user)}
                        disabled={testingId === user.id}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Send WhatsApp test message"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(user.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={12} className="text-slate-400" />
                      <span>{user.phone}</span>
                    </div>
                    {user.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={12} className="text-slate-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe size={12} className="text-slate-400" />
                      <span>{langMap[user.language]?.flag} {langMap[user.language]?.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Briefcase size={12} className="text-slate-400" />
                      <span>{user._count?.assignedSteps ?? 0} tasks assigned</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 rounded-b-xl border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleToggle(user.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                      user.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    {user.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </main>

      {/* ─── Add/Edit Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">
                {editUser ? 'Edit Team Member' : 'Add New Member'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ahmad Razak"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">WhatsApp Phone *</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+601XXXXXXXX"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-xs text-slate-400 mt-1">Include country code. Used for WhatsApp notifications.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email (optional)</label>
                <input
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="name@example.com"
                  type="email"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role *</label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Language *</label>
                  <div className="relative">
                    <select
                      value={form.language}
                      onChange={e => setForm(p => ({ ...p, language: e.target.value as Language }))}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.flag} {l.label}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-slate-900 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
                style={{ background: '#f59e0b' }}
              >
                {saving ? 'Saving...' : <><Check size={14} /> {editUser ? 'Update' : 'Add Member'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm ─── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 text-center mb-1">Delete Member?</h3>
            <p className="text-sm text-slate-500 text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] max-w-md px-4 py-3 rounded-xl shadow-lg border text-sm flex items-start gap-3 animate-fade-in ${
            toast.kind === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <MessageSquare size={16} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
