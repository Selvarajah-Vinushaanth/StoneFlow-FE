'use client';

import { useEffect, useState } from 'react';
import {
  Settings, Globe, Bell, Check, Send, Terminal,
} from 'lucide-react';
import { api } from '@/lib/api';
import Header from '@/components/Header';

interface SystemSettings {
  companyName: string;
  timezone: string;
  notifyAdmin: boolean;
  autoStart: boolean;
}

export default function SettingsPage() {
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [companyName, setCompanyName] = useState('Stone Co Sdn Bhd');
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [autoStart, setAutoStart]     = useState(false);

  // WhatsApp simulator
  const [simPhone, setSimPhone]     = useState('');
  const [simMessage, setSimMessage] = useState('DONE');
  const [simResult, setSimResult]   = useState('');
  const [simLoading, setSimLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    api.get<{ data: SystemSettings }>('/settings')
      .then(r => {
        const d = r.data.data;
        setCompanyName(d.companyName);
        setNotifyAdmin(d.notifyAdmin);
        setAutoStart(d.autoStart);
      })
      .catch(() => {/* use defaults */});
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaveError('');
    try {
      await api.patch('/settings', { companyName, notifyAdmin, autoStart });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError('Failed to save. Make sure backend is running.');
    } finally {
      setSaving(false);
    }
  };

  const handleSimulate = async () => {
    if (!simPhone) { setSimResult('❌ Enter a phone number'); return; }
    setSimLoading(true); setSimResult('');
    try {
      await api.post('/webhooks/simulate', { phone: simPhone, message: simMessage });
      setSimResult(`✅ Simulated "${simMessage}" from ${simPhone} — check WhatsApp Logs`);
    } catch {
      setSimResult('❌ Failed — make sure backend is running and phone matches a worker');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <>
      <Header title="Settings" subtitle="System configuration and integrations" />

      <main className="flex-1 overflow-y-auto" style={{ background: '#f8fafc' }}>
        {/* Page hero strip */}
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">Admin Portal</p>
              <h1 className="text-2xl font-extrabold text-slate-800">System Settings</h1>
              <p className="text-sm text-slate-400 mt-0.5">Configure company preferences, alert behavior, workflow automation, and WhatsApp dry-run testing</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {saveError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-900 transition-all disabled:opacity-60 shadow-sm ${saved ? '' : 'hover:shadow-md hover:-translate-y-px'}`}
                style={{ background: saved ? '#4ade80' : 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
              >
                {saved
                  ? <><Check size={15} /> Saved!</>
                  : saving
                  ? <><Settings size={15} className="animate-spin" /> Saving...</>
                  : <><Settings size={15} /> Save Settings</>}
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── LEFT col (3/5) — Company + Notifications ── */}
            <div className="lg:col-span-3 space-y-5">

              {/* Company card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fff 60%)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                    <Globe size={15} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">Company</h2>
                    <p className="text-xs text-slate-400">Basic organisation details</p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Company Name</label>
                    <input
                      value={companyName} onChange={e => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50 hover:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Notifications card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #fff 60%)' }}>
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Bell size={15} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">Notifications</h2>
                    <p className="text-xs text-slate-400">Control how alerts are sent</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    {
                      label: 'Admin Alerts & WhatsApp Notifications',
                      desc: 'ON → ISSUE / HELP reports appear in the Alerts panel instantly and a WhatsApp message is sent to admin. OFF → no alerts in dashboard and no WhatsApp sent to admin.',
                      val: notifyAdmin,
                      set: setNotifyAdmin,
                    },
                    {
                      label: 'Auto-start workflow on job creation',
                      desc: 'When on, a new job starts immediately after creation and the first assigned worker is notified. Manual Start Workflow is not needed.',
                      val: autoStart,
                      set: setAutoStart,
                    },
                  ].map(({ label, desc, val, set }) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => set(!val)}
                        className={`w-12 h-6 rounded-full flex-shrink-0 transition-all relative ${val ? 'shadow-sm' : ''}`}
                        style={{ background: val ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#e2e8f0' }}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${val ? 'translate-x-6' : ''}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile save button */}
              <div className="flex flex-col gap-2 sm:hidden">
                {saveError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-slate-900 disabled:opacity-60"
                  style={{ background: saved ? '#4ade80' : 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                >
                  {saved ? <><Check size={15} /> Saved!</> : saving ? <><Settings size={15} className="animate-spin" /> Saving...</> : <><Settings size={15} /> Save Settings</>}
                </button>
              </div>
            </div>

            {/* ── RIGHT col (2/5) — WhatsApp Simulator ── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden sticky top-4">
                {/* Amber header */}
                <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Terminal size={17} className="text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-sm">WhatsApp Simulator</h2>
                      <p className="text-xs text-amber-800 mt-0.5">Dry-run test of the worker reply flow</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Simulate a worker replying via WhatsApp without sending real WhatsApp messages. This checks worker matching, inbound parsing, workflow advancement, alerts, logs, and dashboard updates in real time.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Worker Phone</label>
                    <input
                      value={simPhone} onChange={e => setSimPhone(e.target.value)}
                      placeholder="+601XXXXXXXXX"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50 hover:bg-white transition-colors"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">Must match a worker's registered phone</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Reply Type</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {['DONE', 'ISSUE Crack found', 'HELP'].map(m => (
                        <button
                          key={m}
                          onClick={() => setSimMessage(m)}
                          className={`px-2 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                            simMessage === m
                              ? 'border-amber-400 text-amber-800 shadow-sm'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                          }`}
                          style={simMessage === m ? { background: '#fef3c7' } : { background: '#f8fafc' }}
                        >
                          {m.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                    <input
                      value={simMessage} onChange={e => setSimMessage(e.target.value)}
                      placeholder="or type a custom message..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50"
                    />
                  </div>

                  <button
                    onClick={handleSimulate}
                    disabled={simLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-slate-900 disabled:opacity-60 transition-all hover:shadow-md hover:-translate-y-px"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                  >
                    <Send size={14} /> {simLoading ? 'Sending...' : 'Simulate Reply'}
                  </button>

                  <p className="text-xs text-slate-400 -mt-1">
                    Dry run only: no live WhatsApp message is sent to workers or admins from this tester.
                  </p>

                  {simResult && (
                    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-medium ${simResult.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {simResult}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
