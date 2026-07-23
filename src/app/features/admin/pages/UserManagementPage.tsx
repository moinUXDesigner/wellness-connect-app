import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import * as echarts from 'echarts';
import {
  ArrowUpDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  Filter,
  MailPlus,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Role, UserSummary } from '../../../types';
import { getAuthState } from '../../auth/auth';
import {
  AdminUserDeletionError,
  adminDeleteUser,
  adminResetUserPassword,
  getAdminUsers,
  type AdminUserDeletionBlocker,
} from '../../shared/services/adminApi';
import { ToneBadge } from '../../shared/components/Ui';
import { UserAvatar } from '../../../components/UserAvatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { notifyError, notifyInfo, notifySuccess, toast } from '../../shared/lib/toast';

type UserTab = 'all' | 'trainer' | 'client' | 'admin' | 'pending';
type SortOrder = 'newest' | 'oldest';
type RoleFilter = Role | 'all';
type StatusFilter = UserSummary['status'] | 'all';

type UserMetric = {
  key: 'total' | 'active' | 'pending' | 'admins' | 'trainers' | 'clients';
  label: string;
  value: number;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: string;
};

type DistributionSlice = {
  role: string;
  label: string;
  value: number;
  color: string;
};

const userTabs: Array<{ key: UserTab; label: string }> = [
  { key: 'all', label: 'All Users' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'client', label: 'Clients' },
  { key: 'admin', label: 'Admins' },
  { key: 'pending', label: 'Pending' },
];

const roleOptions: RoleFilter[] = ['all', 'admin', 'client', 'counsellor', 'trainer', 'coach', 'helpdesk', 'finance', 'legal', 'content'];
const statusOptions: StatusFilter[] = ['all', 'active', 'pending', 'suspended'];

const roleColors: Record<string, string> = {
  client: '#35c6be',
  trainer: '#8b5cf6',
  admin: '#5b8def',
  counsellor: '#f59e0b',
  coach: '#10b981',
  helpdesk: '#ec4899',
  finance: '#f97316',
  legal: '#64748b',
  content: '#14b8a6',
};

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function roleLabel(role: Role) {
  if (role === 'admin') return 'Admin';
  if (role === 'helpdesk') return 'Help Desk';
  return titleCase(role);
}

function statusTone(status: UserSummary['status']) {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function formatJoinedDate(value: string) {
  const date = joinedDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function joinedDate(value: string) {
  if (!value) return new Date('invalid');
  return new Date(`${value}T00:00:00`);
}

function formatLastActive(value: string | null) {
  if (!value) return 'Never active';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date >= today) {
    return `Today, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  if (date >= yesterday) {
    return `Yesterday, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadFile(fileName: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildUsersCsv(users: UserSummary[]) {
  const header = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Last Active', 'Joined Date']
    .map(csvCell)
    .join(',');

  const rows = users.map((user) => [
    user.name,
    user.email,
    user.phone ?? '',
    roleLabel(user.role),
    titleCase(user.status),
    formatLastActive(user.lastActiveAt),
    formatJoinedDate(user.joinedAt),
  ].map(csvCell).join(','));

  return [header, ...rows].join('\n');
}

function MetricCard({ metric }: { metric: UserMetric }) {
  const Icon = metric.icon;

  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.22)]">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${metric.tone}`}>
        <Icon size={20} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-500">{metric.label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
      <p className="mt-1 text-xs text-slate-500">{metric.hint}</p>
    </article>
  );
}

function RoleDistributionChart({ data, totalUsers }: { data: DistributionSlice[]; totalUsers: number }) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const instance = echarts.init(chartRef.current);
    instance.setOption({
      animation: false,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['58%', '80%'],
          center: ['50%', '44%'],
          label: { show: false },
          data: data.map((slice) => ({
            value: slice.value,
            name: slice.label,
            itemStyle: { color: slice.color },
          })),
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '35%',
          style: {
            text: String(totalUsers),
            fill: '#0f172a',
            font: '700 26px sans-serif',
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '50%',
          style: {
            text: 'Total',
            fill: '#64748b',
            font: '500 12px sans-serif',
          },
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      instance.dispose();
    };
  }, [data, totalUsers]);

  return <div ref={chartRef} className="h-[220px] w-full" />;
}

function LoadingState() {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
            <div className="mt-3 h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-8 w-14 animate-pulse rounded bg-slate-100" />
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[24px] border border-slate-200 p-5">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <section key={index} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-40 animate-pulse rounded-2xl bg-slate-100" />
            </section>
          ))}
        </aside>
      </div>
    </>
  );
}

function EmptyState({ clearFilters }: { clearFilters: () => void }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
      <Users size={28} className="mx-auto text-slate-400" />
      <h3 className="mt-4 text-lg font-semibold text-slate-950">No users match those filters</h3>
      <p className="mt-2 text-sm text-slate-500">Try a different search term or clear the current filters to see more accounts.</p>
      <button
        type="button"
        onClick={clearFilters}
        className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Clear filters
      </button>
    </div>
  );
}

export default function RefinedUserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [tab, setTab] = useState<UserTab>('all');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserSummary | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [blockedDeletion, setBlockedDeletion] = useState<{ user: UserSummary; message: string; blockers: AdminUserDeletionBlocker[] } | null>(null);
  const signedInUserId = String(getAuthState().user?.id ?? '');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError('');

    getAdminUsers()
      .then((data) => {
        if (!mounted) return;
        setUsers(data);
      })
      .catch((error) => {
        if (!mounted) return;
        setUsers([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to fetch database users.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [reloadCount]);

  const metrics = useMemo<UserMetric[]>(() => {
    const total = users.length;
    const active = users.filter((user) => user.status === 'active').length;
    const pending = users.filter((user) => user.status === 'pending').length;
    const admins = users.filter((user) => user.role === 'admin').length;
    const trainers = users.filter((user) => user.role === 'trainer').length;
    const clients = users.filter((user) => user.role === 'client').length;

    const totalHint = total ? 'Live workspace accounts' : 'No users available';
    const activeHint = total ? `${Math.round((active / total) * 100)}% of total users` : 'No active accounts';
    const pendingHint = pending ? `${pending} account${pending === 1 ? '' : 's'} awaiting activation` : 'Nothing waiting for review';
    const adminHint = total ? `${Math.round((admins / total) * 100)}% of total users` : 'No admin accounts';
    const trainerHint = total ? `${Math.round((trainers / total) * 100)}% of total users` : 'No trainer accounts';
    const clientHint = total ? `${Math.round((clients / total) * 100)}% of total users` : 'No client accounts';

    return [
      { key: 'total', label: 'Total Users', value: total, hint: totalHint, icon: Users, tone: 'bg-violet-50 text-violet-600' },
      { key: 'active', label: 'Active Users', value: active, hint: activeHint, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-600' },
      { key: 'pending', label: 'Pending Accounts', value: pending, hint: pendingHint, icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
      { key: 'admins', label: 'Admins', value: admins, hint: adminHint, icon: UserCog, tone: 'bg-sky-50 text-sky-600' },
      { key: 'trainers', label: 'Trainers', value: trainers, hint: trainerHint, icon: UserRoundCheck, tone: 'bg-violet-50 text-violet-600' },
      { key: 'clients', label: 'Clients', value: clients, hint: clientHint, icon: Users, tone: 'bg-cyan-50 text-cyan-600' },
    ];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users
      .filter((user) => {
        if (tab === 'trainer' && user.role !== 'trainer') return false;
        if (tab === 'client' && user.role !== 'client') return false;
        if (tab === 'admin' && user.role !== 'admin') return false;
        if (tab === 'pending' && user.status !== 'pending') return false;
        if (roleFilter !== 'all' && user.role !== roleFilter) return false;
        if (statusFilter !== 'all' && user.status !== statusFilter) return false;
        if (!normalizedSearch) return true;

        const haystack = [
          user.name,
          user.email,
          user.phone ?? '',
          roleLabel(user.role),
          titleCase(user.status),
        ].join(' ').toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => {
        const leftTime = joinedDate(left.joinedAt).getTime();
        const rightTime = joinedDate(right.joinedAt).getTime();
        return sortOrder === 'newest' ? rightTime - leftTime : leftTime - rightTime;
      });
  }, [users, tab, roleFilter, statusFilter, search, sortOrder]);

  const recentPendingUsers = useMemo(
    () => users.filter((user) => user.status === 'pending').slice().sort((left, right) => {
      return joinedDate(right.joinedAt).getTime() - joinedDate(left.joinedAt).getTime();
    }).slice(0, 4),
    [users],
  );

  const roleDistribution = useMemo<DistributionSlice[]>(() => {
    const counts = new Map<string, number>();
    users.forEach((user) => {
      counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([role, value]) => ({
        role,
        label: roleLabel(role as Role),
        value,
        color: roleColors[role] ?? '#94a3b8',
      }))
      .sort((left, right) => right.value - left.value);
  }, [users]);

  const tabCounts = useMemo(() => ({
    all: users.length,
    trainer: users.filter((user) => user.role === 'trainer').length,
    client: users.filter((user) => user.role === 'client').length,
    admin: users.filter((user) => user.role === 'admin').length,
    pending: users.filter((user) => user.status === 'pending').length,
  }), [users]);

  async function handlePasswordReset(user: UserSummary) {
    setResettingUserId(user.id);
    setBlockedDeletion(null);

    try {
      const message = await adminResetUserPassword(user);
      notifySuccess(message);
    } catch (error) {
      notifyError(error, 'Unable to reset password.');
    } finally {
      setResettingUserId(null);
    }
  }

  async function handleDeleteUser() {
    if (!deletingUser) return;

    const user = deletingUser;
    setDeletingUserId(user.id);
    setBlockedDeletion(null);

    try {
      const message = await adminDeleteUser(user);
      setUsers((items) => items.filter((item) => item.id !== user.id));
      notifySuccess(message);
    } catch (error) {
      if (error instanceof AdminUserDeletionError) {
        setBlockedDeletion({ user, message: error.message, blockers: error.blockers });
      } else {
        notifyError(error, 'Unable to delete user.');
      }
    } finally {
      setDeletingUser(null);
      setDeletingUserId(null);
    }
  }

  async function handleCopyEmail(user: UserSummary) {
    if (!navigator.clipboard?.writeText) {
      toast.error('Clipboard access is not available in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(user.email);
      notifySuccess(`Copied ${user.email}.`);
    } catch (error) {
      notifyError(error, 'Unable to copy email.');
    }
  }

  function handleExport() {
    if (!filteredUsers.length) {
      notifyInfo('No visible users to export right now.');
      return;
    }

    downloadFile(
      `admin-users-${new Date().toISOString().slice(0, 10)}.csv`,
      buildUsersCsv(filteredUsers),
      'text/csv;charset=utf-8;',
    );
    notifySuccess('Exported the visible user list.');
  }

  function clearFilters() {
    setTab('all');
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSortOrder('newest');
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8f5ff_45%,#eef6ff_100%)] p-6 shadow-[0_26px_80px_-46px_rgba(76,29,149,0.32)] sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Admin Console</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">User Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Manage member and staff lifecycle across the platform with a live operational view of users, statuses, and role coverage.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => notifyInfo('Direct user creation is not available in this workspace yet.')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-[0_20px_50px_-25px_rgba(109,40,217,0.85)] transition hover:bg-violet-700"
            >
              <Plus size={16} />
              Add User
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
      </section>

      {blockedDeletion ? (
        <section role="alert" className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 shrink-0 text-amber-700" size={20} />
              <div>
                <p className="text-sm font-semibold">Cannot permanently delete {blockedDeletion.user.name}</p>
                <p className="mt-1 text-sm text-amber-800">
                  {blockedDeletion.user.email} has historical records that must be retained. Permanent deletion is unavailable.
                </p>
                {blockedDeletion.blockers.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-amber-900">
                    {blockedDeletion.blockers.map((blocker) => (
                      <li key={blocker.code}>
                        {blocker.label}: <span className="font-semibold">{blocker.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-amber-900">{blockedDeletion.message}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss deletion warning"
              onClick={() => setBlockedDeletion(null)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-amber-700 transition hover:bg-amber-100"
            >
              <X size={17} />
            </button>
          </div>
        </section>
      ) : null}

      {loadError ? (
        <section role="alert" className="flex flex-col gap-4 rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Database user data unavailable</p>
            <p className="mt-1 text-sm text-rose-700">No user records are displayed because the database request failed. {loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="shrink-0 rounded-2xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Retry
          </button>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {userTabs.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                        tab === item.key
                          ? 'border-violet-200 bg-violet-600 text-white shadow-[0_18px_40px_-28px_rgba(109,40,217,0.8)]'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] ${tab === item.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {tabCounts[item.key]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="text-sm text-slate-500">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_180px_52px]">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <Search size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search users by name, email or phone..."
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <UserCog size={16} className="text-slate-400" />
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role === 'all' ? 'All Roles' : roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <ShieldCheck size={16} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === 'all' ? 'All Statuses' : titleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <ArrowUpDown size={16} className="text-slate-400" />
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Clear filters"
                  title="Clear filters"
                >
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {loadError ? (
                <div className="rounded-[28px] border border-dashed border-rose-200 bg-rose-50 px-6 py-14 text-center">
                  <Users size={28} className="mx-auto text-rose-400" />
                  <h3 className="mt-4 text-lg font-semibold text-rose-950">User data could not be loaded</h3>
                  <p className="mt-2 text-sm text-rose-700">Retry the request once database access is available again.</p>
                </div>
              ) : !filteredUsers.length ? (
                <EmptyState clearFilters={clearFilters} />
              ) : (
                <>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full table-fixed text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          <th className="px-2 py-4">User</th>
                          <th className="px-2 py-4">Email</th>
                          <th className="px-2 py-4">Phone</th>
                          <th className="px-2 py-4">Role</th>
                          <th className="px-2 py-4">Status</th>
                          <th className="px-2 py-4">Last Active</th>
                          <th className="px-2 py-4">Joined Date</th>
                          <th className="px-2 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => {
                          const rowBusy = resettingUserId === user.id || deletingUserId === user.id;

                          return (
                            <tr key={user.id} className="border-b border-slate-100 align-top last:border-b-0">
                              <td className="px-2 py-4">
                                <div className="flex min-w-0 items-center gap-3">
                                  <UserAvatar user={user} size="lg" className="h-11 w-11 border border-white shadow-sm" />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                                    <p className="truncate text-xs text-slate-500">{roleLabel(user.role)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-4 text-sm text-slate-600">{user.email}</td>
                              <td className="px-2 py-4 text-sm text-slate-600">{user.phone ?? 'Not provided'}</td>
                              <td className="px-2 py-4">
                                <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                                  {roleLabel(user.role)}
                                </span>
                              </td>
                              <td className="px-2 py-4">
                                <ToneBadge tone={statusTone(user.status)}>{titleCase(user.status)}</ToneBadge>
                              </td>
                              <td className="px-2 py-4 text-sm text-slate-600">{formatLastActive(user.lastActiveAt)}</td>
                              <td className="px-2 py-4 text-sm text-slate-600">{formatJoinedDate(user.joinedAt)}</td>
                              <td className="px-2 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyEmail(user)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                    aria-label={`Copy email for ${user.name}`}
                                    title="Copy email"
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        disabled={rowBusy}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        aria-label={`More actions for ${user.name}`}
                                      >
                                        <MoreVertical size={16} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-200 bg-white p-1 shadow-xl">
                                      <DropdownMenuItem onClick={() => void handlePasswordReset(user)} disabled={rowBusy}>
                                        {resettingUserId === user.id ? 'Resetting password...' : 'Reset password'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => navigate('/admin/roles')}>
                                        Open role management
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {user.id !== signedInUserId ? (
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => {
                                            setBlockedDeletion(null);
                                            setDeletingUser(user);
                                          }}
                                          disabled={rowBusy}
                                        >
                                          Delete user
                                        </DropdownMenuItem>
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-4 lg:hidden">
                    {filteredUsers.map((user) => {
                      const rowBusy = resettingUserId === user.id || deletingUserId === user.id;

                      return (
                        <article key={user.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar user={user} size="lg" className="border border-white shadow-sm" />
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-slate-950">{user.name}</p>
                                <p className="truncate text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  disabled={rowBusy}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label={`More actions for ${user.name}`}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-200 bg-white p-1 shadow-xl">
                                <DropdownMenuItem onClick={() => void handleCopyEmail(user)}>
                                  Copy email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void handlePasswordReset(user)} disabled={rowBusy}>
                                  {resettingUserId === user.id ? 'Resetting password...' : 'Reset password'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/admin/roles')}>
                                  Open role management
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.id !== signedInUserId ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      setBlockedDeletion(null);
                                      setDeletingUser(user);
                                    }}
                                    disabled={rowBusy}
                                  >
                                    Delete user
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                              {roleLabel(user.role)}
                            </span>
                            <ToneBadge tone={statusTone(user.status)}>{titleCase(user.status)}</ToneBadge>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Phone</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">{user.phone ?? 'Not provided'}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Last Active</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">{formatLastActive(user.lastActiveAt)}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Joined</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">{formatJoinedDate(user.joinedAt)}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Safe Action</p>
                              <button
                                type="button"
                                onClick={() => void handleCopyEmail(user)}
                                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-violet-700"
                              >
                                <Copy size={15} />
                                Copy email
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)]">
            <h2 className="text-xl font-semibold text-slate-950">Role Distribution</h2>
            <RoleDistributionChart data={roleDistribution} totalUsers={users.length} />
            <div className="mt-2 space-y-3">
              {roleDistribution.slice(0, 5).map((slice) => {
                const percentage = users.length ? Math.round((slice.value / users.length) * 100) : 0;

                return (
                  <div key={slice.role} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="text-sm text-slate-600">{slice.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {slice.value} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">Recent Pending Accounts</h2>
              <button
                type="button"
                onClick={() => setTab('pending')}
                className="text-sm font-semibold text-violet-600 transition hover:text-violet-700"
              >
                View all
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentPendingUsers.length ? recentPendingUsers.map((user) => (
                <article key={user.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <ToneBadge tone="warning">Pending</ToneBadge>
                    <p className="mt-1 text-xs text-slate-400">{formatJoinedDate(user.joinedAt)}</p>
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No pending accounts right now.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)]">
            <h2 className="text-xl font-semibold text-slate-950">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              {[
                {
                  label: 'Review pending accounts',
                  icon: Clock3,
                  action: () => {
                    setTab('pending');
                    setStatusFilter('pending');
                  },
                },
                {
                  label: 'Manage user roles',
                  icon: UserCog,
                  action: () => navigate('/admin/roles'),
                },
                {
                  label: 'Update permissions',
                  icon: ShieldCheck,
                  action: () => navigate('/admin/permissions'),
                },
                {
                  label: 'Trainer applications',
                  icon: UserRoundCheck,
                  action: () => navigate('/admin/trainer-applications'),
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                        <Icon size={18} />
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,#fbf9ff_0%,#f4f7ff_100%)] p-5 shadow-[0_20px_60px_-38px_rgba(76,29,149,0.18)]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <CircleHelp size={20} />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Need help?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Our support team is here to help with account status, access issues, and admin troubleshooting.
            </p>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <MailPlus size={16} />
              Contact Support
            </button>
          </section>
        </aside>
      </div>

      <AlertDialog open={deletingUser !== null} onOpenChange={(open) => { if (!open && !deletingUserId) setDeletingUser(null); }}>
        <AlertDialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[460px]">
          <div className="flex items-start gap-4 px-6 pb-5 pt-6">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Trash2 size={20} />
            </span>
            <AlertDialogHeader className="gap-2 pt-0.5 text-left">
              <AlertDialogTitle>Delete user account?</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingUser ? `Deleting ${deletingUser.name} (${deletingUser.email}) permanently removes their account and signs out active sessions.` : ''}
              </AlertDialogDescription>
              <p className="text-sm font-medium text-rose-700">This action cannot be undone.</p>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <AlertDialogCancel
              disabled={deletingUserId !== null}
              className="h-10 border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); void handleDeleteUser(); }}
              disabled={deletingUserId !== null}
              className="h-10 bg-rose-600 px-4 text-white hover:bg-rose-700 focus-visible:ring-rose-300"
            >
              {deletingUserId ? 'Deleting...' : 'Delete user'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
