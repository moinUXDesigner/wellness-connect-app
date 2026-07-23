import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageTitle } from '../AdminLayout';
import { Panel, ToneBadge } from '../../shared/components/Ui';
import { adminUpdatePermissions, adminUpdateUserRole, getAdminActivities, getAdminEscalations, getAdminOverview, getAdminPermissionMatrix, getAdminPrograms, getAdminRoleChanges, getAdminUsers, type PermissionChangeAudit, type PermissionItem, type RoleChangeAudit } from '../../shared/services/adminApi';
import { archiveAdminMembershipPlan, getAdminMembershipPlans, publishAdminMembershipPlan, saveAdminMembershipPlan, type AdminMembershipPlan, type PlanDraft } from '../../shared/services/membershipApi';
import type { AppointmentSummary, ProgramSummary, Role, TicketSummary, UserSummary } from '../../../types';
import { clearAuthState, getAuthState } from '../../auth/auth';
import {
  nextActionLabel,
  statusLabel,
  type TrainerApplicationRecord,
  type TrainerApplicationStatus,
} from '../../trainer/trainerOnboarding';
import { fetchAdminTrainerApplicationsFromApi, updateTrainerApplicationReviewInApi } from '../../trainer/trainerApplicationsApi';
import RefinedUserManagementPage from './UserManagementPage';
import { toast, notifyError, notifySuccess } from '../../shared/lib/toast';

const roleOptions: Role[] = ['admin', 'client', 'counsellor', 'trainer', 'coach', 'helpdesk', 'finance', 'legal', 'content'];
const assignableRoles: Role[] = ['client', 'trainer', 'helpdesk', 'admin', 'finance', 'legal', 'content'];

function toneByUserStatus(status: UserSummary['status']) {
  return status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'danger';
}

function trainerApplicationTone(status: TrainerApplicationStatus) {
  if (status === 'approved') return 'success';
  if (status === 'needs_resubmission' || status === 'submitted') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

export function UserManagementPage() {
  return <RefinedUserManagementPage />;
}

export function RoleManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [audits, setAudits] = useState<RoleChangeAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [nextRole, setNextRole] = useState<Role>('client');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError('');

    Promise.all([getAdminUsers(), getAdminRoleChanges()])
      .then(([nextUsers, nextAudits]) => {
        if (!mounted) return;
        setUsers(nextUsers);
        setAudits(nextAudits);
      })
      .catch((error) => {
        if (!mounted) return;
        setUsers([]);
        setAudits([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to load role management data.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [reloadCount]);

  const roleCounts = useMemo(() => roleOptions.map((role) => ({
    role,
    users: users.filter((user) => user.role === role).length,
  })), [users]);
  const lastChangeByUser = useMemo(() => {
    const latestByUser = new Map<string, RoleChangeAudit>();
    audits.forEach((audit) => {
      if (!latestByUser.has(audit.targetUserId)) latestByUser.set(audit.targetUserId, audit);
    });
    return latestByUser;
  }, [audits]);
  const query = search.trim().toLowerCase();
  const visibleUsers = users.filter((user) => (
    (roleFilter === 'all' || user.role === roleFilter)
    && (!query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
  ));

  function openRoleChange(user: UserSummary) {
    setEditingUser(user);
    setNextRole(user.role === 'client' ? 'helpdesk' : 'client');
    setReason('');
  }

  async function saveRoleChange() {
    if (!editingUser || saving) return;
    setSaving(true);

    try {
      const result = await adminUpdateUserRole(editingUser.id, nextRole, reason.trim());
      if (String(getAuthState().user?.id) === editingUser.id) {
        clearAuthState();
        navigate('/login', { replace: true, state: { authNotice: 'Your role was updated. Please sign in again to continue.' } });
        return;
      }
      notifySuccess(result.message);
      setEditingUser(null);
      setReloadCount((count) => count + 1);
    } catch (error) {
      notifyError(error, 'Unable to update user role.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Role Management" subtitle="Assign workspace access with approval and audit controls." />
      {loadError ? (
        <section role="alert" className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Role data unavailable</p>
            <p className="mt-1 text-sm text-rose-700">{loadError}</p>
          </div>
          <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">Retry</button>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 9 }).map((_, index) => (
              <article key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-7 w-10 animate-pulse rounded bg-slate-200" />
              </article>
            ))
          : roleCounts.map(({ role, users: count }) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
                className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${roleFilter === role ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{role}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{count}</p>
              </button>
            ))}
      </section>

      <Panel title="User Role Assignments">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 md:max-w-sm"
          />
          <p className="text-xs text-slate-500">Counsellor and coach assignment requires a future approval workflow.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">User</th><th className="py-2">Current Role</th><th className="py-2">Status</th><th className="py-2">Last Change</th><th className="py-2 text-right">Action</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-t border-slate-200">
                  <td className="py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /><div className="mt-2 h-3 w-48 animate-pulse rounded bg-slate-200" /></td>
                  <td className="py-4"><div className="h-5 w-20 animate-pulse rounded bg-slate-200" /></td>
                  <td className="py-4"><div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" /></td>
                  <td className="py-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-200" /></td>
                  <td className="py-4"><div className="ml-auto h-9 w-28 animate-pulse rounded-xl bg-slate-200" /></td>
                </tr>
              )) : visibleUsers.length ? visibleUsers.map((user) => {
                const change = lastChangeByUser.get(user.id);
                const disabledReason = user.status !== 'active' ? 'Only active accounts can be assigned roles.' : '';
                return (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="py-3 capitalize">{user.role}</td>
                    <td className="py-3"><ToneBadge tone={toneByUserStatus(user.status)}>{user.status}</ToneBadge></td>
                    <td className="py-3 text-xs text-slate-500">{change ? `${change.previousRole} to ${change.newRole}` : 'No recorded changes'}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openRoleChange(user)}
                        disabled={Boolean(disabledReason)}
                        title={disabledReason}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Change Role
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr className="border-t border-slate-200">
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">{loadError ? 'Unable to display users until role data can be loaded.' : 'No users match this filter.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Recent Role Changes">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : audits.length ? (
          <div className="space-y-3">
            {audits.slice(0, 10).map((audit) => (
              <article key={audit.id} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <p className="font-medium text-slate-900">{audit.targetName} <span className="font-normal text-slate-500">changed from</span> <span className="capitalize">{audit.previousRole}</span> <span className="font-normal text-slate-500">to</span> <span className="capitalize">{audit.newRole}</span></p>
                <p className="mt-1 text-xs text-slate-500">By {audit.actorName} | {audit.changedAt ? new Date(audit.changedAt).toLocaleString() : 'Unknown time'} | {audit.reason}</p>
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">No role changes recorded.</p>}
      </Panel>

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
          <section role="dialog" aria-modal="true" aria-labelledby="role-change-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="role-change-title" className="text-xl font-semibold text-slate-900">Change user role</h2>
            <p className="mt-2 text-sm text-slate-600">{editingUser.name} ({editingUser.email}) currently has the <span className="font-semibold capitalize">{editingUser.role}</span> role.</p>
            <label className="mt-5 block text-sm font-medium text-slate-700">New role</label>
            <select value={nextRole} onChange={(event) => setNextRole(event.target.value as Role)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm">
              {assignableRoles.map((role) => <option key={role} value={role} disabled={role === editingUser.role}>{role}</option>)}
            </select>
            <p className="mt-2 text-xs text-slate-500">Trainer assignment is allowed only after approved trainer onboarding. User sessions will be signed out after a change.</p>
            <label className="mt-5 block text-sm font-medium text-slate-700">Reason for change</label>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} required placeholder="Describe why access is being changed" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setEditingUser(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={saving || !reason.trim() || nextRole === editingUser.role} onClick={() => void saveRoleChange()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving...' : 'Confirm Role Change'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function PermissionMatrixPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [grants, setGrants] = useState<Partial<Record<Role, string[]>>>({});
  const [audits, setAudits] = useState<PermissionChangeAudit[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role>('client');
  const [draftKeys, setDraftKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError('');

    getAdminPermissionMatrix()
      .then((data) => {
        if (!mounted) return;
        setRoles(data.roles);
        setPermissions(data.permissions);
        setGrants(data.grants);
        setAudits(data.audits);
        setDraftKeys(data.grants[selectedRole] ?? []);
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : 'Unable to load the permission matrix.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [reloadCount]);

  useEffect(() => {
    setDraftKeys(grants[selectedRole] ?? []);
  }, [grants, selectedRole]);

  const baselineKeys = grants[selectedRole] ?? [];
  const normalize = (keys: string[]) => [...keys].sort().join('|');
  const changed = normalize(draftKeys) !== normalize(baselineKeys);
  const moduleGroups = useMemo(() => {
    const grouped = new Map<string, PermissionItem[]>();
    permissions.forEach((permission) => {
      const items = grouped.get(permission.module) ?? [];
      items.push(permission);
      grouped.set(permission.module, items);
    });
    return [...grouped.entries()];
  }, [permissions]);
  const configurableCount = permissions.filter((permission) => permission.configurable && permission.available).length;
  const lockedCount = permissions.filter((permission) => !permission.configurable && permission.available).length;

  function togglePermission(key: string) {
    setDraftKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function savePermissions() {
    if (!reason.trim() || !changed || saving || selectedRole === 'admin') return;
    setSaving(true);

    try {
      const result = await adminUpdatePermissions(selectedRole, draftKeys, reason.trim());
      notifySuccess(result.message);
      setConfirming(false);
      setReason('');
      setReloadCount((count) => count + 1);
    } catch (error) {
      notifyError(error, 'Unable to save permissions.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Permission Matrix" subtitle="Control role access to supported modules and actions." />
      {loadError ? (
        <section role="alert" className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-900">Permission data unavailable</p>
            <p className="mt-1 text-sm text-rose-700">{loadError}</p>
          </div>
          <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700">Retry</button>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {loading ? Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="h-3 w-20 animate-pulse rounded bg-slate-200" /><div className="mt-3 h-7 w-14 animate-pulse rounded bg-slate-200" /></article>
        )) : (
          <>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase text-slate-500">Roles</p><p className="mt-2 text-2xl font-semibold text-slate-900">{roles.length}</p></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase text-slate-500">Configurable</p><p className="mt-2 text-2xl font-semibold text-indigo-700">{configurableCount}</p></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase text-slate-500">Locked</p><p className="mt-2 text-2xl font-semibold text-slate-900">{lockedCount}</p></article>
          </>
        )}
      </section>

      <Panel title="Roles">
        <div className="flex flex-wrap gap-2">
          {loading ? Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />) : roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold capitalize ${selectedRole === role ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              {role}{role === 'admin' ? ' (locked)' : ''}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={`${selectedRole[0].toUpperCase()}${selectedRole.slice(1)} Permissions`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">Module</th><th className="py-2">Permission</th><th className="py-2">Action</th><th className="py-2">Policy</th><th className="py-2 text-right">Granted</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 7 }).map((_, index) => (
                <tr key={index} className="border-t border-slate-200"><td className="py-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-200" /></td><td><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /></td><td><div className="h-4 w-14 animate-pulse rounded bg-slate-200" /></td><td><div className="h-6 w-20 animate-pulse rounded bg-slate-200" /></td><td><div className="ml-auto h-6 w-10 animate-pulse rounded-full bg-slate-200" /></td></tr>
              )) : moduleGroups.flatMap(([module, items]) => items.map((permission, index) => {
                const enabled = draftKeys.includes(permission.key);
                const editable = selectedRole !== 'admin' && permission.configurable && permission.available;
                return (
                  <tr key={permission.key} className="border-t border-slate-200">
                    <td className="py-3 font-medium text-slate-900">{index === 0 ? module : ''}</td>
                    <td className="py-3 text-slate-700">{permission.label}</td>
                    <td className="py-3 capitalize text-slate-500">{permission.action}</td>
                    <td className="py-3">
                      {!permission.available ? <ToneBadge tone="neutral">Coming soon</ToneBadge> : editable ? <ToneBadge tone="success">Configurable</ToneBadge> : <ToneBadge tone="warning">Locked</ToneBadge>}
                    </td>
                    <td className="py-3 text-right">
                      <input type="checkbox" checked={enabled} disabled={!editable} onChange={() => togglePermission(permission.key)} aria-label={`Grant ${permission.label}`} className="h-4 w-4 accent-indigo-600 disabled:opacity-50" />
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => { setReason(''); setConfirming(true); }} disabled={!changed || selectedRole === 'admin'} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Save Permission Changes</button>
        </div>
      </Panel>

      <Panel title="Recent Permission Changes">
        {loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : audits.length ? (
          <div className="space-y-3">
            {audits.slice(0, 10).map((audit) => (
              <article key={audit.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <p className="font-semibold capitalize text-slate-900">{audit.targetRole} permissions updated <span className="font-normal text-slate-500">by {audit.actorName}</span></p>
                <p className="mt-1 text-xs text-slate-500">{audit.changedAt ? new Date(audit.changedAt).toLocaleString() : 'Unknown time'} | {audit.reason}</p>
                <p className="mt-2 text-xs text-slate-600">Added: {audit.addedPermissions.join(', ') || 'none'} | Removed: {audit.removedPermissions.join(', ') || 'none'}</p>
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">No permission changes recorded.</p>}
      </Panel>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
          <section role="dialog" aria-modal="true" aria-labelledby="permission-confirm-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="permission-confirm-title" className="text-xl font-semibold text-slate-900">Confirm permission changes</h2>
            <p className="mt-2 text-sm text-slate-600">Changes to <span className="font-semibold capitalize">{selectedRole}</span> access apply immediately to active sessions.</p>
            <label className="mt-5 block text-sm font-medium text-slate-700">Reason for change</label>
            <textarea rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this permission update is needed" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setConfirming(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" disabled={saving || !reason.trim()} onClick={() => void savePermissions()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving...' : 'Confirm Changes'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function ProfessionalApprovalsPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch(() => setLoadError('Unable to load professional approvals from the database.'));
  }, []);

  const pending = useMemo(() => users.filter((u) => u.status === 'pending'), [users]);

  return <SimpleList title="Professional Approvals" subtitle="Review and approve counsellor, trainer, and coach applications." items={loadError ? [loadError] : pending.map((u) => `${u.name} (${u.role}) - submitted ${u.joinedAt}`)} />;
}

export function TrainerApplicationsPage() {
  const [applications, setApplications] = useState<TrainerApplicationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncApplications() {
      const nextApplications = (await fetchAdminTrainerApplicationsFromApi()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      if (cancelled) return;
      setApplications(nextApplications);
      setSelectedId((current) => current ?? nextApplications[0]?.applicationId ?? null);
    }

    void syncApplications();
    const handleSync = () => {
      void syncApplications();
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const selectedApplication = useMemo(
    () => applications.find((item) => item.applicationId === selectedId) ?? applications[0] ?? null,
    [applications, selectedId],
  );

  useEffect(() => {
    setRemarks(selectedApplication?.adminRemarks ?? '');
  }, [selectedApplication]);

  const stats = useMemo(() => ({
    total: applications.length,
    submitted: applications.filter((item) => item.status === 'submitted').length,
    resubmission: applications.filter((item) => item.status === 'needs_resubmission').length,
    approved: applications.filter((item) => item.status === 'approved').length,
  }), [applications]);

  async function applyAdminDecision(status: TrainerApplicationStatus) {
    if (!selectedApplication) return;

    const trimmedRemarks = remarks.trim();
    if ((status === 'needs_resubmission' || status === 'rejected') && !trimmedRemarks) {
      toast.error(status === 'needs_resubmission' ? 'Add remarks so the trainer knows what to fix.' : 'Add a rejection reason before closing the application.');
      return;
    }

    setIsSavingDecision(true);
    try {
      const result = await updateTrainerApplicationReviewInApi({
        applicationId: selectedApplication.applicationId,
        status,
        adminRemarks: trimmedRemarks,
      });
      const nextApplication = result.application;

      setApplications((current) =>
        current
          .map((item) => (item.applicationId === nextApplication.applicationId ? nextApplication : item))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
      setSelectedId(nextApplication.applicationId);
      setRemarks(nextApplication.adminRemarks);
      if (status === 'approved' && result.account?.created && result.account.temporaryPassword) {
        notifySuccess(`Trainer account created for ${result.account.email}. Temporary password: ${result.account.temporaryPassword}. Share it securely and ask the trainer to change it after signing in.`);
      } else if (status === 'approved' && result.account) {
        notifySuccess(`Trainer account activated for ${result.account.email}. The trainer can now access the workspace with their existing password.`);
      } else {
        notifySuccess('Application status updated.');
      }
    } catch (error) {
      notifyError(error, 'Unable to update the trainer application.');
    } finally {
      setIsSavingDecision(false);
    }
  }

  const reviewSections = selectedApplication
    ? [
        {
          title: 'Applicant',
          rows: [
            ['Name', selectedApplication.applicantName],
            ['Email', selectedApplication.applicantEmail],
            ['Mobile', selectedApplication.applicantMobile],
            ['Location', `${selectedApplication.city}, ${selectedApplication.state}`],
            ['Application ID', selectedApplication.applicationId],
          ],
        },
        {
          title: 'Credentials',
          rows: [
            ['Certification institute', selectedApplication.values.certification.institute || 'Not provided'],
            ['Certification type', selectedApplication.values.certification.type || 'Not provided'],
            ['Expertise', selectedApplication.expertise.length ? selectedApplication.expertise.join(', ') : 'Not provided'],
            ['Years experience', selectedApplication.values.experience.yearsExperience || 'Not provided'],
            ['Clients trained', selectedApplication.values.experience.clientsTrained || 'Not provided'],
            ['Why clients should choose them', selectedApplication.values.clientPitch || 'Not provided'],
          ],
        },
        {
          title: 'Documents and media',
          rows: [
            ['Profile photo', selectedApplication.values.photo.file?.name || 'Missing'],
            ['Certificate file', selectedApplication.values.certification.certificate?.name || 'Missing'],
            ['PAN', selectedApplication.values.identity.pan?.name || 'Missing'],
            ['Primary ID', selectedApplication.values.identity.aadhaar?.name || selectedApplication.values.identity.passport?.name || selectedApplication.values.identity.drivingLicense?.name || 'Missing'],
            ['Transformation photos', selectedApplication.values.showcase.transformationPhotos.length ? selectedApplication.values.showcase.transformationPhotos.map((item) => item.name).join(', ') : 'Skipped for now'],
            ['Videos', selectedApplication.values.showcase.videos.length ? selectedApplication.values.showcase.videos.map((item) => item.name).join(', ') : 'Skipped for now'],
            ['Intro video', selectedApplication.values.training.introductionVideo?.name || 'Skipped for now'],
          ],
        },
        {
          title: 'Delivery and payout',
          rows: [
            ['Training modes', selectedApplication.values.availability.modes.length ? selectedApplication.values.availability.modes.join(', ') : 'Not provided'],
            ['Available days', selectedApplication.values.availability.days.length ? selectedApplication.values.availability.days.join(', ') : 'Not provided'],
            ['Per session rate', selectedApplication.values.availability.perSessionRateInr ? `INR ${selectedApplication.values.availability.perSessionRateInr}` : 'Not provided'],
            ['Monthly rate', selectedApplication.values.availability.monthlyRateInr ? `INR ${selectedApplication.values.availability.monthlyRateInr}` : 'Not provided'],
            ['Pricing notes', selectedApplication.values.availability.pricingPlans || 'Not provided'],
            ['Bank name', selectedApplication.values.payout.bankName || 'Not provided'],
            ['Account number', selectedApplication.values.payout.accountNumber ? `•••• ${selectedApplication.values.payout.accountNumber.slice(-4)}` : 'Not provided'],
            ['IFSC', selectedApplication.values.payout.ifsc || 'Not provided'],
          ],
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageTitle title="Trainer Applications" subtitle="Review trainer onboarding submissions, documents, demo videos, interviews, and approval decisions." />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Applications</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">New Submissions</p>
          <p className="mt-2 text-2xl font-semibold text-sky-700">{stats.submitted}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Need Resubmission</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{stats.resubmission}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Approved</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{stats.approved}</p>
        </article>
      </section>

      <Panel title="Application Queue">
        {!applications.length ? (
          <p className="text-sm text-slate-500">No trainer onboarding submissions have been sent yet.</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Trainer</th>
                <th className="py-2">Status</th>
                <th className="py-2">Submitted</th>
                <th className="py-2">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr
                  key={application.applicationId}
                  className={`border-t border-slate-200 transition ${selectedApplication?.applicationId === application.applicationId ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}
                >
                  <td className="py-2">
                    <button type="button" onClick={() => setSelectedId(application.applicationId)} className="text-left">
                      <span className="block font-medium text-slate-900">{application.applicantName}</span>
                      <span className="text-xs text-slate-500">{application.applicantEmail}</span>
                    </button>
                  </td>
                  <td className="py-2"><ToneBadge tone={trainerApplicationTone(application.status)}>{statusLabel(application.status)}</ToneBadge></td>
                  <td className="py-2 text-slate-700">{new Date(application.submittedAt).toLocaleDateString()}</td>
                  <td className="py-2 text-slate-600">{nextActionLabel(application.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Panel>

      <Panel title="Application Review">
        {!selectedApplication ? (
          <p className="text-sm text-slate-500">Choose a trainer application from the queue to review it.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">{selectedApplication.applicantName}</h3>
                <p className="mt-1 text-sm text-slate-600">{selectedApplication.applicantEmail} • {selectedApplication.applicantMobile}</p>
                <p className="mt-1 text-sm text-slate-500">Submitted {new Date(selectedApplication.submittedAt).toLocaleString()}</p>
              </div>
              <ToneBadge tone={trainerApplicationTone(selectedApplication.status)}>{statusLabel(selectedApplication.status)}</ToneBadge>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="space-y-5">
                {reviewSections.map((section) => (
                  <section key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{section.title}</h4>
                    <dl className="mt-3 grid gap-3">
                      {section.rows.map(([label, value]) => (
                        <div key={label} className="border-b border-slate-200 pb-3 last:border-b-0">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                          <dd className="mt-1 text-sm leading-6 text-slate-700">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>

              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Admin remarks</h4>
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Add review notes, missing items, approval notes, or rejection reasons."
                    className="mt-3 min-h-36 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-400"
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Decision Actions</h4>
                  <div className="mt-3 grid gap-3">
                    <button type="button" onClick={() => void applyAdminDecision('under_review')} disabled={isSavingDecision} className="rounded-xl border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                      Mark Under Review
                    </button>
                    <button type="button" onClick={() => void applyAdminDecision('needs_resubmission')} disabled={isSavingDecision} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
                      Send Back for Resubmission
                    </button>
                    <button type="button" onClick={() => void applyAdminDecision('approved')} disabled={isSavingDecision} className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">
                      Approve Application
                    </button>
                    <button type="button" onClick={() => void applyAdminDecision('rejected')} disabled={isSavingDecision} className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-900 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">
                      Reject Application
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Review history</h4>
                  <div className="mt-3 space-y-3">
                    {selectedApplication.reviewHistory.length ? (
                      [...selectedApplication.reviewHistory].slice().reverse().map((item) => (
                        <div key={item.id} className="border-l-2 border-slate-200 pl-4">
                          <p className="text-sm font-semibold text-slate-900">{statusLabel(item.action)}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.note}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.actor} • {new Date(item.at).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No review actions recorded yet.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

export function WorkflowConfigurationPage() {
  return <SimpleList title="Workflow Configuration" subtitle="Operational flows for booking, escalation, and follow-ups." items={['Intake assignment workflow', 'Session no-show handling', 'Critical risk escalation path', 'Cross-team follow-up SLA policy']} />;
}

export function RevenueReportsPage() {
  const monthlyRecurringRevenue = [82, 88, 94, 102, 108, 116, 122, 128, 131, 138, 146, 154];
  const monthlyOrders = [420, 460, 490, 515, 548, 576, 602, 618, 641, 668, 702, 734];
  const refundRate = [4.1, 3.9, 3.6, 3.4, 3.3, 3.1, 2.9, 2.7, 2.8, 2.6, 2.5, 2.4];

  const trendOption: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 22, right: 20, top: 24, bottom: 24, containLabel: true },
    legend: { bottom: 0, textStyle: { color: '#475569' } },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: [
      {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', formatter: '${value}k' },
      },
      {
        type: 'value',
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#64748b' },
      },
    ],
    series: [
      {
        name: 'MRR',
        type: 'line',
        smooth: true,
        data: monthlyRecurringRevenue,
        yAxisIndex: 0,
        symbol: 'circle',
        symbolSize: 7,
        itemStyle: { color: '#2563eb' },
        lineStyle: { width: 3, color: '#2563eb' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37,99,235,0.24)' },
            { offset: 1, color: 'rgba(37,99,235,0.02)' },
          ]),
        },
      },
      {
        name: 'Orders',
        type: 'line',
        smooth: true,
        data: monthlyOrders,
        yAxisIndex: 1,
        symbol: 'none',
        itemStyle: { color: '#0ea5e9' },
        lineStyle: { width: 2, color: '#0ea5e9', type: 'dashed' },
      },
      {
        name: 'Refund %',
        type: 'line',
        smooth: true,
        data: refundRate,
        yAxisIndex: 1,
        symbol: 'none',
        itemStyle: { color: '#f97316' },
        lineStyle: { width: 2, color: '#f97316' },
      },
    ],
  };

  const planSplitOption: echarts.EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#475569' } },
    series: [
      {
        type: 'pie',
        radius: ['58%', '78%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: [
          { value: 42, name: 'Premium Care', itemStyle: { color: '#2563eb' } },
          { value: 28, name: 'Mind + Body', itemStyle: { color: '#0ea5e9' } },
          { value: 18, name: 'Corporate', itemStyle: { color: '#14b8a6' } },
          { value: 12, name: 'Family', itemStyle: { color: '#94a3b8' } },
        ],
      },
    ],
    graphic: [
      { type: 'text', left: 'center', top: '37%', style: { text: '154k', fill: '#0f172a', font: '700 24px sans-serif' } },
      { type: 'text', left: 'center', top: '51%', style: { text: 'Monthly ARR', fill: '#64748b', font: '500 12px sans-serif' } },
    ],
  };

  const agingOption: echarts.EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 22, right: 20, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', formatter: '${value}k' },
    },
    yAxis: {
      type: 'category',
      data: ['0-30 days', '31-60 days', '61-90 days', '90+ days'],
      axisLine: { show: false },
      axisLabel: { color: '#475569' },
    },
    series: [
      {
        type: 'bar',
        data: [44, 26, 14, 8],
        barWidth: 16,
        itemStyle: {
          borderRadius: 8,
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#93c5fd' },
          ]),
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Revenue Reports" subtitle="Finance overview powered by mock analytics data." />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monthly Revenue</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">$154K</p>
          <p className="mt-2 text-xs font-medium text-emerald-700">+12.8% vs previous month</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">734</p>
          <p className="mt-2 text-xs font-medium text-emerald-700">+9.2% conversion uplift</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Avg. Ticket Size</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">$209</p>
          <p className="mt-2 text-xs font-medium text-sky-700">Stable across top plans</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Outstanding Invoices</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">$92K</p>
          <p className="mt-2 text-xs font-medium text-amber-700">Needs collection follow-up</p>
        </article>
      </section>

      <Panel title="Monthly recurring revenue trend">
        <EChart option={trendOption} height={360} />
      </Panel>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Plan-wise revenue split">
          <EChart option={planSplitOption} height={300} />
        </Panel>
        <Panel title="Outstanding invoices aging">
          <EChart option={agingOption} height={300} />
        </Panel>
      </section>
    </div>
  );
}

export function UsageMetricsPage() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    getAdminOverview().then((data) => setItems((data.usage_metrics ?? []).map((u) => `${u.label}: ${u.value} (${u.delta})`)));
  }, []);

  return <SimpleList title="Usage Metrics" subtitle="Engagement and operational KPIs." items={items} />;
}

export function PerformanceDashboardPage() {
  return <SimpleList title="Performance Dashboard" subtitle="Platform and team performance summaries." items={['Counsellor utilization 78%', 'Trainer utilization 72%', 'Coach follow-up completion 88%', 'Help desk first response 24m']} />;
}

export function PlatformHealthPage() {
  return <SimpleList title="Platform Health" subtitle="System and process health checkpoints." items={['Auth services: healthy', 'Booking service: healthy', 'Messaging queue: monitored', 'Escalation pipeline: healthy']} />;
}

export function EscalationsPage() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);

  useEffect(() => {
    getAdminEscalations().then(setTickets);
  }, []);

  return <SimpleList title="Escalations" subtitle="High-priority cases requiring admin action." items={tickets.filter((t) => t.priority !== 'low').map((t) => `${t.id}: ${t.title} (${t.status})`)} />;
}

export function ProgramManagementPage() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);

  useEffect(() => {
    getAdminPrograms().then(setPrograms);
  }, []);

  return <SimpleList title="Program Management" subtitle="Manage wellness programs and lifecycle status." items={programs.map((p) => `${p.title} - ${p.category} - ${p.status}`)} />;
}

export function MembershipPlanManagementPage() {
  const emptyDraft: PlanDraft = { name: '', description: '', duration_weeks: 4, credits: { counselling: 0, training: 0 }, tiers: [{ label: 'Standard', amount_minor: 0 }] };
  const [plans, setPlans] = useState<AdminMembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const [showEditor, setShowEditor] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setPlans(await getAdminMembershipPlans()); } catch (error) { notifyError(error, 'Unable to load membership plans.'); } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  function edit(plan?: AdminMembershipPlan) {
    const version = plan?.latestVersion;
    setEditingId(plan?.id);
    setDraft(plan && version ? {
      name: plan.name, description: plan.description ?? '', duration_weeks: version.duration_weeks,
      credits: { counselling: version.included_credits_json.counselling ?? 0, training: version.included_credits_json.training ?? 0 },
      internal_cost_counselling_minor: version.internal_cost_counselling_minor ?? null,
      internal_cost_training_minor: version.internal_cost_training_minor ?? null,
      tiers: version.tiers.map((tier) => ({ label: tier.label, amount_minor: tier.amount_minor })),
    } : { ...emptyDraft, credits: { ...emptyDraft.credits }, tiers: [...emptyDraft.tiers] });
    setShowEditor(true);
  }
  async function save() {
    try {
      const result = await saveAdminMembershipPlan(draft, editingId);
      notifySuccess(result.message); setShowEditor(false); await refresh();
    } catch (error) { notifyError(error, 'Unable to save membership draft.'); }
  }
  async function publish(id: number) {
    try { notifySuccess((await publishAdminMembershipPlan(id)).message); await refresh(); } catch (error) { notifyError(error, 'Unable to publish plan.'); }
  }
  async function archive(id: number) {
    try { notifySuccess((await archiveAdminMembershipPlan(id)).message); await refresh(); } catch (error) { notifyError(error, 'Unable to archive plan.'); }
  }

  return <div className="space-y-6">
    <PageTitle title="Membership Plan Management" subtitle="Publish immutable plan terms and one-time INR price tiers." />
    <div className="flex justify-end"><button type="button" onClick={() => edit()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">New Plan</button></div>
    <section className="grid gap-4 md:grid-cols-3">
      {loading ? Array.from({ length: 3 }).map((_, index) => <article key={index} className="h-52 animate-pulse rounded-2xl bg-slate-100" />) : plans.length ? plans.map((plan) => {
        const version = plan.latestVersion;
        const lowest = version?.tiers?.length ? Math.min(...version.tiers.map((tier) => tier.amount_minor)) : null;
        const margin = lowest !== null && plan.estimatedCostMinor !== null ? lowest - plan.estimatedCostMinor : null;
        return <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2"><h2 className="font-semibold text-slate-900">{plan.name}</h2><ToneBadge tone={plan.status === 'published' ? 'success' : plan.status === 'archived' ? 'danger' : 'warning'}>{plan.status}</ToneBadge></div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{plan.description || 'No description'}</p>
          <p className="mt-3 text-sm text-slate-700">{version?.included_credits_json.counselling ?? 0} counselling | {version?.included_credits_json.training ?? 0} training</p>
          <p className="mt-1 text-xs text-slate-500">Versions: {plan.versionCount} | {lowest === null ? 'No price tier' : `From INR ${(lowest / 100).toFixed(0)}`}</p>
          <p className="mt-1 text-xs text-slate-500">{margin === null ? 'Cost not configured' : `Estimated margin: INR ${(margin / 100).toFixed(0)}`}</p>
          <div className="mt-4 flex gap-2"><button onClick={() => edit(plan)} className="rounded-lg border px-3 py-2 text-sm">Edit Draft</button><button onClick={() => void publish(plan.id)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">Publish</button><button onClick={() => void archive(plan.id)} className="rounded-lg border px-3 py-2 text-sm">Archive</button></div>
        </article>;
      }) : <p className="col-span-full rounded-xl bg-slate-50 p-8 text-center text-slate-600">No membership plans exist yet.</p>}
    </section>
    {showEditor ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"><section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
      <h2 className="text-xl font-semibold">{editingId ? 'Edit Plan Draft' : 'New Membership Plan'}</h2>
      <p className="mt-1 text-sm text-slate-500">Publishing creates terms used only by future purchases.</p>
      <div className="mt-5 grid gap-3">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Plan name" className="rounded-xl border p-3" />
        <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" className="rounded-xl border p-3" />
        <label className="text-sm">Duration in weeks<input type="number" value={draft.duration_weeks} onChange={(e) => setDraft({ ...draft, duration_weeks: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-3" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Counselling credits<input type="number" value={draft.credits.counselling} onChange={(e) => setDraft({ ...draft, credits: { ...draft.credits, counselling: Number(e.target.value) } })} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm">Training credits<input type="number" value={draft.credits.training} onChange={(e) => setDraft({ ...draft, credits: { ...draft.credits, training: Number(e.target.value) } })} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm">Counselling cost (INR)<input type="number" value={(draft.internal_cost_counselling_minor ?? 0) / 100} onChange={(e) => setDraft({ ...draft, internal_cost_counselling_minor: Number(e.target.value) * 100 })} className="mt-1 w-full rounded-xl border p-3" /></label>
          <label className="text-sm">Training cost (INR)<input type="number" value={(draft.internal_cost_training_minor ?? 0) / 100} onChange={(e) => setDraft({ ...draft, internal_cost_training_minor: Number(e.target.value) * 100 })} className="mt-1 w-full rounded-xl border p-3" /></label>
        </div>
        {draft.tiers.map((tier, index) => <div key={index} className="grid grid-cols-2 gap-3"><input value={tier.label} onChange={(e) => setDraft({ ...draft, tiers: draft.tiers.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} placeholder="Tier label" className="rounded-xl border p-3" /><input type="number" value={tier.amount_minor / 100} onChange={(e) => setDraft({ ...draft, tiers: draft.tiers.map((item, i) => i === index ? { ...item, amount_minor: Number(e.target.value) * 100 } : item) })} placeholder="Price INR" className="rounded-xl border p-3" /></div>)}
        <button type="button" onClick={() => setDraft({ ...draft, tiers: [...draft.tiers, { label: '', amount_minor: 0 }] })} className="rounded-xl border p-2 text-sm">Add Price Tier</button>
      </div>
      <div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowEditor(false)} className="rounded-xl border px-4 py-2">Cancel</button><button disabled={!draft.name || !draft.tiers.length} onClick={() => void save()} className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">Save Draft</button></div>
    </section></div> : null}
  </div>;
}

export function ActivityLogsPage() {
  const [activities, setActivities] = useState<AppointmentSummary[]>([]);

  useEffect(() => {
    getAdminActivities().then(setActivities);
  }, []);

  return <SimpleList title="Activity Logs" subtitle="Audit and activity stream." items={activities.map((a) => `${a.id}: ${a.serviceType} ${a.status} for ${a.clientName}`)} />;
}

function SimpleList({ title, subtitle, items, loading = false }: { title: string; subtitle: string; items: string[]; loading?: boolean }) {
  return (
    <div className="space-y-6">
      <PageTitle title={title} subtitle={subtitle} />
      <Panel title="Overview">
        <ul className="space-y-2 text-sm text-slate-700">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <li key={index} aria-hidden="true" className="rounded-xl border border-slate-200 px-3 py-3">
                  <div className="h-4 w-full max-w-xs animate-pulse rounded bg-slate-200" />
                </li>
              ))
            : items.map((item) => (
                <li key={item} className="rounded-xl border border-slate-200 px-3 py-2">{item}</li>
              ))}
          {!loading && !items.length ? <li className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500">No records found.</li> : null}
        </ul>
      </Panel>
    </div>
  );
}

function EChart({ option, height }: { option: echarts.EChartsOption; height: number }) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const instance = echarts.init(chartRef.current);
    instance.setOption(option);
    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      instance.dispose();
    };
  }, [option]);

  return <div ref={(node) => { chartRef.current = node; }} style={{ height, width: '100%' }} />;
}
