import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role =
  | 'ADMIN' | 'MANAGER' | 'SALESMAN' | 'SITE_SUPERVISOR'
  | 'CUTTER' | 'POLISHER' | 'EDGE_FINISHER'
  | 'PACKER' | 'LOADER' | 'INSTALLER' | 'QC_INSPECTOR' | 'DRIVER' | 'WORKER';

export type Language = 'ENGLISH' | 'BANGLA' | 'MANDARIN' | 'BAHASA_MALAY' | 'TAMIL';
export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type StepStatus =
  | 'WAITING' | 'NOTIFIED' | 'IN_PROGRESS' | 'ISSUE' | 'HELP_NEEDED' | 'COMPLETED' | 'SKIPPED';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  language: Language;
  isActive: boolean;
  createdAt: string;
  _count?: { assignedSteps: number };
}

export interface WorkflowSubTask {
  id: string;
  stepId: string;
  title: string;
  description?: string;
  assignedUserId?: string;
  dueAt?: string;
  isCompleted: boolean;
  status: 'WAITING' | 'NOTIFIED' | 'COMPLETED';
  order: number;
  createdAt: string;
  assignedUser?: { name: string; role: string };
  issueText?: string;
  durationMinutes?: number | null;
  timerStartedAt?: string | null;
  timerAlertSentAt?: string | null;
}

export interface WorkflowStep {
  id: string;
  jobId: string;
  stepNumber: number;
  name: string;
  description?: string;
  assignedUserId?: string;
  assignedUser?: User;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  dueAt?: string;
  issueText?: string;
  durationMinutes?: number | null;
  timerStartedAt?: string | null;
  subTasks?: WorkflowSubTask[];
}

export interface Job {
  id: string;
  jobNumber: string;
  title: string;
  clientName: string;
  clientPhone?: string;
  description?: string;
  measurements?: string;
  material?: string;
  color?: string;
  startDate?: string;
  deadline: string;
  status: JobStatus;
  priority: Priority;
  totalSteps: number;
  completedSteps: number;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  workflowSteps: WorkflowStep[];
  auditLogs?: AuditLog[];
  _count?: { photos: number; messages: number };
}

export interface AuditLog {
  id: string;
  jobId?: string;
  stepId?: string;
  userId?: string;
  eventType: string;
  description: string;
  createdAt: string;
  job?: { jobNumber: string; title: string };
  user?: { name: string };
}

export interface AlertStep {
  id: string;
  name: string;
  status: 'ISSUE' | 'HELP_NEEDED';
  issueText?: string;
  updatedAt: string;
  job: { id: string; jobNumber: string; title: string };
  assignedUser?: { id: string; name: string; phone: string };
  isSubTask?: boolean;
  stepId?: string;
}

export interface DashboardData {
  stats: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    pendingJobs: number;
    upcomingJobs: number;
    totalUsers: number;
    overdueJobs: number;
    alertCount: number;
  };
  recentJobs: Job[];
  recentActivity: AuditLog[];
  alertSteps: AlertStep[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => api.get<{ success: boolean; data: DashboardData }>('/dashboard'),
};

export const usersApi = {
  list: () => api.get<{ success: boolean; data: User[] }>('/users'),
  get: (id: string) => api.get<{ success: boolean; data: User }>(`/users/${id}`),
  create: (data: Partial<User>) => api.post<{ success: boolean; data: User }>('/users', data),
  update: (id: string, data: Partial<User>) => api.put<{ success: boolean; data: User }>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  toggle: (id: string) => api.patch<{ success: boolean; data: User }>(`/users/${id}/toggle`),
};

export const jobsApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: Job[] }>('/jobs', { params }),
  get: (id: string) => api.get<{ success: boolean; data: Job }>(`/jobs/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Job }>('/jobs', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean; data: Job }>(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
  start: (id: string) => api.post(`/jobs/${id}/start`),
  completeStep: (jobId: string, stepId: string) =>
    api.post(`/jobs/${jobId}/steps/${stepId}/complete`),
  setTimer: (jobId: string, stepId: string, durationMinutes: number) =>
    api.post(`/jobs/${jobId}/steps/${stepId}/timer/start`, { durationMinutes }),
  resetTimer: (jobId: string, stepId: string) =>
    api.post(`/jobs/${jobId}/steps/${stepId}/timer/reset`),
  getActiveTimers: () =>
    api.get<{ success: boolean; data: unknown[] }>('/jobs/timers/active'),
  raiseIssue: (jobId: string, stepId: string, type: 'ISSUE' | 'HELP', details?: string, adminId?: string) =>
    api.post(`/jobs/${jobId}/steps/${stepId}/raise`, { type, details, adminId }),
  setSubTaskTimer: (jobId: string, stepId: string, subTaskId: string, durationMinutes: number) =>
    api.post(`/jobs/${jobId}/steps/${stepId}/subtasks/${subTaskId}/timer/start`, { durationMinutes }),
  resetSubTaskTimer: (jobId: string, stepId: string, subTaskId: string) =>
    api.post(`/jobs/${jobId}/steps/${stepId}/subtasks/${subTaskId}/timer/reset`),
  raiseSubTaskIssue: (jobId: string, stepId: string, subTaskId: string, type: 'ISSUE' | 'HELP', details?: string, adminId?: string) =>
    api.post(`/jobs/${jobId}/steps/${stepId}/subtasks/${subTaskId}/raise`, { type, details, adminId }),
  completeSubTask: (jobId: string, stepId: string, subTaskId: string) =>
    api.post(`/jobs/${jobId}/steps/${stepId}/subtasks/${subTaskId}/complete`),
};

export const messagesApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: unknown[] }>('/messages', { params }),
  byJob: (jobId: string) =>
    api.get<{ success: boolean; data: unknown[] }>(`/messages/job/${jobId}`),
};

export const whatsappApi = {
  simulate: (phone: string, message: string) =>
    api.post('/webhooks/simulate', { phone, message }),
  test: (payload: { phone?: string; userId?: string; message?: string }) =>
    api.post<{
      success: boolean;
      delivery: {
        status: 'sent' | 'failed' | 'simulated' | 'demo_sent';
        sid?: string;
        errorCode?: string | number;
        errorMessage?: string;
        to?: string;
      };
      config: { from: string; hasSid: boolean; hasToken: boolean };
    }>('/webhooks/test', payload),
  config: () =>
    api.get<{
      success: boolean;
      data: { from: string; hasSid: boolean; hasToken: boolean; verifyTokenSet: boolean };
    }>('/webhooks/config'),
};
