'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { projectsApi, Project, ProjectStatus } from '@/lib/api';
import {
  Plus, Search, FolderKanban, MapPin, User, Calendar,
  Layers, ChevronRight, Building2,
} from 'lucide-react';
import Header from '@/components/Header';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; dot: string; badge: string }> = {
  PLANNING:  { label: 'Planning',   dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-700' },
  ACTIVE:    { label: 'Active',     dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
  ON_HOLD:   { label: 'On Hold',    dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed',  dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Cancelled',  dot: 'bg-red-400',    badge: 'bg-red-100 text-red-700' },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await projectsApi.list(params);
      setProjects(res.data.data);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Header
        title="Projects"
        subtitle="Multi-level projects — group jobs by levels and units"
        action={
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#7c3aed' }}
          >
            <Plus size={15} /> New Project
          </Link>
        }
      />

      <main className="flex-1 p-6 overflow-y-auto" style={{ background: '#f8fafc' }}>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects, clients..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderKanban size={40} className="text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">No projects yet</p>
            <p className="text-sm text-slate-400 mb-4">Create your first project to group jobs by levels and units</p>
            <Link
              href="/projects/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#7c3aed' }}
            >
              <Plus size={14} /> New Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map(project => {
              const sc = STATUS_CONFIG[project.status];
              const levelCount = project.levelCount ?? project._count?.levels ?? 0;
              const unitCount = project.totalUnits ?? 0;
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all p-5 flex flex-col gap-3"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-base leading-tight truncate">{project.name}</p>
                        <p className="text-xs text-slate-400">{project.projectNumber}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User size={12} /> {project.clientName}
                    </span>
                    {project.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {project.location}
                      </span>
                    )}
                    {project.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(project.deadline).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Layers size={12} className="text-violet-400" />
                        <strong>{levelCount}</strong> level{levelCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderKanban size={12} className="text-violet-400" />
                        <strong>{unitCount}</strong> unit{unitCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-violet-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
