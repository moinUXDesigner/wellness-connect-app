import { mockAppointments } from '../../../data/mockAppointments';
import type { AppointmentSummary, DashboardMetric, ProgramSummary, Role, TicketSummary, UserSummary } from '../../../types';
import { getAuthState } from '../../auth/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

type RoleDistributionItem = {
  role: Role;
  users: number;
  status: 'healthy' | 'attention' | 'needs-review';
};

type AdminOverview = {
  analytics: DashboardMetric[];
  usage_metrics: DashboardMetric[];
  role_distribution: RoleDistributionItem[];
  recent_escalations: TicketSummary[];
};

export type WorkflowKey =
  | 'intake_assignment'
  | 'session_no_show'
  | 'critical_risk_escalation'
  | 'cross_team_follow_up_sla';

export type IntakeAssignmentWorkflowConfig = {
  highRiskSymptoms: string[];
  stressThreshold: number;
  highRiskOutcome: 'under_review';
  lowRiskOutcome: 'auto_bookable';
  reviewEtaHours: number;
};

export type SessionNoShowWorkflowConfig = {
  delayAfterEndMinutes: number;
  eligibleStatuses: Array<'scheduled' | 'rescheduled'>;
  notifyClient: boolean;
};

export type CriticalRiskEscalationWorkflowConfig = {
  recipientRoles: Array<'admin' | 'helpdesk'>;
  priority: 'high';
  notificationChannel: 'in_app';
  titleTemplate: string;
};

export type CrossTeamFollowUpSlaWorkflowConfig = {
  supportRequestDueMinutes: number;
  escalationDueMinutesByPriority: {
    low: number;
    medium: number;
    high: number;
  };
  breachRecipientRoles: Array<'admin' | 'helpdesk'>;
};

type WorkflowConfigMap = {
  intake_assignment: IntakeAssignmentWorkflowConfig;
  session_no_show: SessionNoShowWorkflowConfig;
  critical_risk_escalation: CriticalRiskEscalationWorkflowConfig;
  cross_team_follow_up_sla: CrossTeamFollowUpSlaWorkflowConfig;
};

export type WorkflowConfigPayload = WorkflowConfigMap[WorkflowKey];

export type WorkflowActor = {
  id: number;
  name: string;
  email: string;
};

export type WorkflowRevision = {
  id: number;
  reason: string;
  config: WorkflowConfigPayload;
  createdAt: string | null;
  actor: WorkflowActor | null;
};

export type WorkflowConfigSummary = {
  key: WorkflowKey;
  label: string;
  description: string;
  config: WorkflowConfigPayload;
  updatedAt: string | null;
  updatedBy: WorkflowActor | null;
  revisions: WorkflowRevision[];
};

export type WorkflowCaseAction = 'acknowledge' | 'resolve' | 'reopen' | 'close';

export type WorkflowCaseHistoryEntry = {
  action: string;
  actorName?: string;
  actorEmail?: string;
  at: string;
  note?: string | null;
};

export type WorkflowCase = {
  id: number;
  workflowKey: WorkflowKey;
  workflowLabel: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'breached' | 'closed';
  priority: 'low' | 'medium' | 'high';
  ownerRole: Role;
  title: string;
  summary: string;
  dueAt: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  breachedAt: string | null;
  updatedAt: string | null;
  subject: {
    type: 'intake_flow' | 'support_request' | 'unknown';
    id: number;
    label: string;
    secondaryLabel: string;
    status: string;
  };
  meta: {
    history?: WorkflowCaseHistoryEntry[];
    [key: string]: unknown;
  };
};

export type PerformanceWindow = '7d' | '30d' | '90d';

export type PerformanceSummaryCard = {
  key: string;
  label: string;
  value: number | null;
  unit: 'percent' | 'minutes' | 'hours' | 'count';
  deltaLabel: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
};

export type UtilizationMetric = {
  label: string;
  numerator: number;
  denominator: number;
  percentage: number | null;
};

export type PerformanceTrendSeries = {
  key: string;
  label: string;
  data: number[];
};

export type WorkflowPerformanceSummary = {
  labels: string[];
  escalation: {
    opened: number;
    resolved: number;
    breached: number;
    openNow: number;
    breachedNow: number;
    breachRate: number | null;
    medianResolutionMinutes: number | null;
    openedSeries: number[];
    resolvedSeries: number[];
  };
  support: {
    opened: number;
    acknowledged: number;
    resolved: number;
    openNow: number;
    breachedNow: number;
    medianFirstResponseMinutes: number | null;
    openedSeries: number[];
    resolvedSeries: number[];
  };
};

export type TrainerApplicationPerformanceSummary = {
  submitted: number;
  underReview: number;
  resolved: number;
  medianTurnaroundHours: number | null;
};

export type PerformanceExceptionRow = {
  id: number | string;
  title: string;
  secondaryLabel: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | null;
  ownerRole: Role | 'admin';
  dueAt: string | null;
  ageHours: number | null;
};

export type AdminPerformanceDashboard = {
  window: PerformanceWindow;
  summaryCards: PerformanceSummaryCard[];
  utilization: {
    counsellor: UtilizationMetric;
    trainer: UtilizationMetric;
  };
  appointmentTrends: {
    labels: string[];
    series: PerformanceTrendSeries[];
    completionRate: number | null;
    noShowRate: number | null;
  };
  workflowPerformance: WorkflowPerformanceSummary;
  trainerApplicationPerformance: TrainerApplicationPerformanceSummary;
  exceptions: {
    escalations: PerformanceExceptionRow[];
    supportCases: PerformanceExceptionRow[];
    trainerApplications: PerformanceExceptionRow[];
  };
};

export type RoleChangeAudit = {
  id: string;
  actorName: string;
  actorEmail: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  previousRole: Role;
  newRole: Role;
  reason: string;
  changedAt: string | null;
};

export type PermissionItem = {
  key: string;
  module: string;
  label: string;
  action: string;
  sortOrder: number;
  configurable: boolean;
  available: boolean;
};

export type PermissionChangeAudit = {
  id: string;
  actorName: string;
  actorEmail: string;
  targetRole: Role;
  reason: string;
  addedPermissions: string[];
  removedPermissions: string[];
  changedAt: string | null;
};

export type PermissionMatrixResponse = {
  roles: Role[];
  permissions: PermissionItem[];
  grants: Partial<Record<Role, string[]>>;
  audits: PermissionChangeAudit[];
};

function authHeaders(token = getAuthState().token, withJson = false): HeadersInit {
  return {
    Accept: 'application/json',
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  return null;
}

async function fetchAdmin<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}/admin/${path}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(String(data?.message ?? 'Unable to fetch admin data'));
  }

  return data as T;
}

function buildQuery(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getAdminOverview() {
  return fetchAdmin<AdminOverview>('overview');
}

export async function getAdminPerformance(window: PerformanceWindow = '30d') {
  return fetchAdmin<AdminPerformanceDashboard>(`performance${buildQuery({ window })}`);
}

export async function getAdminUsers() {
  const data = await fetchAdmin<{ users: UserSummary[] }>('users');
  return data.users;
}

export async function adminResetUserPassword(user: UserSummary) {
  if (!/^\d+$/.test(String(user.id))) {
    throw new Error('Password reset is available only for registered database users.');
  }

  const token = getAuthState().token;
  if (!token) throw new Error('Missing admin session token.');

  const response = await fetch(`${API_BASE}/admin/users/${user.id}/reset-password`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({}),
  });

  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(String(data?.message ?? 'Unable to reset password in database.'));
  }

  return String(data?.message ?? `Password reset for ${user.email}. New password: password123`);
}

export type AdminUserDeletionBlocker = {
  code: string;
  label: string;
  count: number;
};

export class AdminUserDeletionError extends Error {
  blockers: AdminUserDeletionBlocker[];

  constructor(message: string, blockers: AdminUserDeletionBlocker[]) {
    super(message);
    this.name = 'AdminUserDeletionError';
    this.blockers = blockers;
  }
}

export async function adminDeleteUser(user: UserSummary) {
  const token = getAuthState().token;
  if (!token) throw new Error('Missing admin session token.');

  const response = await fetch(`${API_BASE}/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const data = await readJson(response);

  if (!response.ok) {
    if (response.status === 409 && Array.isArray(data?.blockers)) {
      const blockers = data.blockers
        .filter((item: unknown): item is AdminUserDeletionBlocker => (
          typeof item === 'object'
          && item !== null
          && typeof (item as AdminUserDeletionBlocker).code === 'string'
          && typeof (item as AdminUserDeletionBlocker).label === 'string'
          && typeof (item as AdminUserDeletionBlocker).count === 'number'
        ));
      throw new AdminUserDeletionError(String(data?.message ?? 'Unable to delete user.'), blockers);
    }
    throw new Error(String(data?.message ?? 'Unable to delete user.'));
  }

  return String(data?.message ?? `Deleted user ${user.email}.`);
}

export async function getAdminRoleChanges() {
  const data = await fetchAdmin<{ roleChanges: RoleChangeAudit[] }>('role-changes');
  return data.roleChanges;
}

export async function adminUpdateUserRole(userId: string, role: Role, reason: string) {
  const token = getAuthState().token;
  if (!token) throw new Error('Missing admin session token.');

  const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ role, reason }),
  });

  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(String(data?.message ?? 'Unable to update user role.'));
  }

  return data as { message: string; user: UserSummary; roleChange: RoleChangeAudit };
}

export async function getAdminPermissionMatrix() {
  return fetchAdmin<PermissionMatrixResponse>('permissions');
}

export async function adminUpdatePermissions(role: Role, permissions: string[], reason: string) {
  const token = getAuthState().token;
  if (!token) throw new Error('Missing admin session token.');

  const response = await fetch(`${API_BASE}/admin/permissions/${role}`, {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify({ permissions, reason }),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(String(data?.message ?? 'Unable to update permissions.'));
  return data as { message: string; role: Role; permissions: string[]; audit: PermissionChangeAudit };
}

export async function getAdminPrograms() {
  const data = await fetchAdmin<{ programs: ProgramSummary[] }>('programs');
  return data.programs;
}

export async function getAdminEscalations() {
  const data = await fetchAdmin<{ tickets: TicketSummary[] }>('escalations');
  return data.tickets;
}

export async function getAdminActivities() {
  try {
    const data = await fetchAdmin<{ activities: AppointmentSummary[] }>('activities');
    return data.activities;
  } catch {
    return mockAppointments;
  }
}

export async function getAdminWorkflows() {
  const data = await fetchAdmin<{ workflows: WorkflowConfigSummary[] }>('workflows');
  return data.workflows;
}

export async function updateAdminWorkflow(workflowKey: WorkflowKey, config: WorkflowConfigPayload, reason: string) {
  const token = getAuthState().token;
  if (!token) throw new Error('Missing admin session token.');

  const response = await fetch(`${API_BASE}/admin/workflows/${workflowKey}`, {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify({ config, reason }),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(String(data?.message ?? 'Unable to update workflow configuration.'));
  return data as { message: string; workflow: WorkflowConfigSummary };
}

export async function getAdminWorkflowCases(filters: { workflowKey?: WorkflowKey; status?: WorkflowCase['status']; ownerRole?: Role } = {}) {
  const data = await fetchAdmin<{ cases: WorkflowCase[] }>(`workflow-cases${buildQuery({
    workflowKey: filters.workflowKey,
    status: filters.status,
    ownerRole: filters.ownerRole,
  })}`);
  return data.cases;
}

export async function getHelpdeskWorkflowCases() {
  const token = getAuthState().token;
  if (!token) throw new Error('Missing helpdesk session token.');

  const response = await fetch(`${API_BASE}/helpdesk/workflow-cases`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(String(data?.message ?? 'Unable to fetch helpdesk workflow cases.'));
  return (data?.cases ?? []) as WorkflowCase[];
}

export async function updateWorkflowCase(caseId: number, action: WorkflowCaseAction, note?: string) {
  const token = getAuthState().token;
  if (!token) throw new Error('Missing session token.');

  const response = await fetch(`${API_BASE}/workflow-cases/${caseId}`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ action, note }),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(String(data?.message ?? 'Unable to update workflow case.'));
  return data as { message: string; case: WorkflowCase };
}
