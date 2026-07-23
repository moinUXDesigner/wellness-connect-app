import { useEffect, useState, type ChangeEventHandler, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Download,
  FilterX,
  MoreVertical,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle2,
  Users,
  Waves,
} from 'lucide-react';
import { getActivityLogs, type ActivityLogFilters } from '../shared/services/activityApi';
import { notifySuccess, toast } from '../shared/lib/toast';
import type { ActivityLogActorOption, ActivityLogEntry, ActivityLogPagination, ActivityLogSummary, Role } from '../../types';
import { UserAvatar } from '../../components/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { buildActivityPresentation, type ActivityPresentation, type ActivitySeverity } from './activityPresentation';

const roleOptions: Role[] = ['admin', 'client', 'counsellor', 'trainer', 'coach', 'helpdesk', 'finance', 'legal', 'content'];

type ActivityLogPageProps = {
  title: string;
  subtitle: string;
  emptyMessage: string;
  showAdminFilters?: boolean;
};

type DatePreset = '7d' | '30d' | '90d' | 'all';

type AdminFilterState = {
  query: string;
  activityType: string;
  performedBy: string;
  affectedRole: string;
  severity: ActivitySeverity | '';
  datePreset: DatePreset;
};

const emptyPagination: ActivityLogPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

const emptySummary: ActivityLogSummary = {
  totalActivities: 0,
  todayActivities: 0,
  admins: 0,
  usersAffected: 0,
  criticalActions: 0,
};

const defaultAdminFilters: AdminFilterState = {
  query: '',
  activityType: '',
  performedBy: '',
  affectedRole: '',
  severity: '',
  datePreset: '7d',
};

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateLabel(value: string | null) {
  if (!value) return { day: 'Unknown date', time: 'Unknown time' };
  const date = new Date(value);
  return {
    day: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

function rangeForPreset(preset: DatePreset) {
  const end = new Date();
  const start = new Date(end);

  if (preset === '7d') start.setDate(end.getDate() - 6);
  if (preset === '30d') start.setDate(end.getDate() - 29);
  if (preset === '90d') start.setDate(end.getDate() - 89);

  const formatQueryDate = (date: Date) => date.toISOString().slice(0, 10);
  const formatDisplayDate = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  if (preset === 'all') {
    return {
      dateFrom: undefined,
      dateTo: undefined,
      label: 'All time',
    };
  }

  return {
    dateFrom: formatQueryDate(start),
    dateTo: formatQueryDate(end),
    label: `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`,
  };
}

function severityStyles(severity: ActivitySeverity) {
  if (severity === 'high') return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  if (severity === 'medium') return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
}

function summaryCardTone(index: number) {
  const tones = [
    'bg-violet-100 text-violet-600',
    'bg-emerald-100 text-emerald-600',
    'bg-sky-100 text-sky-600',
    'bg-amber-100 text-amber-600',
    'bg-rose-100 text-rose-600',
  ];

  return tones[index] ?? tones[0];
}

function clientSummaryTone(index: number) {
  const tones = [
    'border-violet-100 bg-violet-50/55 text-violet-600 shadow-violet-100/70',
    'border-blue-100 bg-blue-50/50 text-blue-600 shadow-blue-100/60',
    'border-emerald-100 bg-emerald-50/50 text-emerald-600 shadow-emerald-100/60',
    'border-purple-100 bg-purple-50/50 text-purple-600 shadow-purple-100/60',
    'border-amber-100 bg-amber-50/55 text-amber-600 shadow-amber-100/60',
  ];

  return tones[index] ?? tones[0];
}

function clientValueTone(index: number) {
  const tones = ['text-violet-600', 'text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600'];
  return tones[index] ?? tones[0];
}

function clientActivityType(actionKey: string) {
  if (['booked', 'rescheduled', 'cancelled', 'completed', 'no_show'].includes(actionKey)) return 'Appointments';
  if (['profile_updated', 'password_changed', 'password_reset', 'password_reset_forced', 'login', 'logout', 'registered'].includes(actionKey)) return 'Profile';
  if (['plan_created', 'plan_updated', 'plan_published', 'plan_archived', 'checkout_initiated'].includes(actionKey)) return 'Membership';
  if (['payment_captured', 'refund_processed'].includes(actionKey)) return 'Payments';
  return 'All Activities';
}

function clientStatusLabel(presentation: ActivityPresentation) {
  const statusByAction: Record<string, string> = {
    booked: 'Confirmed',
    rescheduled: 'Rescheduled',
    cancelled: 'Cancelled',
    completed: 'Completed',
    no_show: 'Missed',
    profile_updated: 'Success',
    password_changed: 'Success',
    password_reset: 'Completed',
    login: 'Success',
    logout: 'Saved',
    plan_created: 'Saved',
    plan_updated: 'Saved',
    plan_published: 'Active',
    checkout_initiated: 'Started',
    payment_captured: 'Completed',
    refund_processed: 'Refunded',
  };

  return statusByAction[presentation.actionKey] ?? (presentation.severity === 'high' ? 'Attention' : presentation.severity === 'medium' ? 'Updated' : 'Saved');
}

function clientStatusTone(status: string) {
  if (['Success', 'Confirmed', 'Active', 'Submitted'].includes(status)) return 'bg-emerald-100 text-emerald-700';
  if (['Completed', 'New'].includes(status)) return 'bg-blue-100 text-blue-700';
  if (['Rescheduled', 'Started', 'Updated'].includes(status)) return 'bg-amber-100 text-amber-700';
  if (['Cancelled', 'Missed', 'Attention', 'Refunded'].includes(status)) return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-600';
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

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(entries: Array<{ entry: ActivityLogEntry; presentation: ActivityPresentation }>) {
  const header = [
    'Time',
    'Performed By',
    'Action',
    'What Happened',
    'Affected',
    'Severity',
    'IP Address',
  ].map(csvCell).join(',');

  const rows = entries.map(({ entry, presentation }) => [
    entry.occurredAt ? new Date(entry.occurredAt).toLocaleString() : 'Unknown time',
    presentation.performerName,
    presentation.actionLabel,
    presentation.summary,
    presentation.affectedName,
    titleCase(presentation.severity),
    presentation.ipAddress,
  ].map(csvCell).join(','));

  return [header, ...rows].join('\n');
}

function buildPresentedEntries(entries: ActivityLogEntry[]) {
  return entries.map((entry) => ({
    entry,
    presentation: buildActivityPresentation(entry),
  }));
}

function PersonPill({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar user={{ name }} size="sm" className="h-9 w-9 border border-white shadow-sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function EntityPill({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
        <Waves size={16} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ActivityDetailCard({
  item,
  onClose,
}: {
  item: { entry: ActivityLogEntry; presentation: ActivityPresentation } | undefined;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <section className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(76,29,149,0.35)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${item.presentation.actionTone}`}>
              <item.presentation.actionIcon size={14} />
              {item.presentation.actionLabel}
            </span>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${severityStyles(item.presentation.severity)}`}>
              {titleCase(item.presentation.severity)}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.presentation.summary}</h3>
          <p className="mt-1 text-sm text-slate-500">Original system summary: {item.entry.summary}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Performed By</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{item.presentation.performerName}</p>
          <p className="text-xs text-slate-500">{item.presentation.performerRole}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Affected</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{item.presentation.affectedName}</p>
          <p className="text-xs text-slate-500">{item.presentation.affectedMeta}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Time</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateLabel(item.entry.occurredAt).day}</p>
          <p className="text-xs text-slate-500">{formatDateLabel(item.entry.occurredAt).time}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">IP Address</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{item.presentation.ipAddress}</p>
          <p className="text-xs text-slate-500">Captured with the activity when available</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
        <p className="mb-3 font-semibold text-white">Technical details</p>
        <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(item.entry.details ?? {}, null, 2)}</pre>
      </div>
    </section>
  );
}

function StandardFeed({
  title,
  subtitle,
  emptyMessage,
  entries,
  pagination,
  summary,
  loading,
  error,
  onPageChange,
}: {
  title: string;
  subtitle: string;
  emptyMessage: string;
  entries: Array<{ entry: ActivityLogEntry; presentation: ActivityPresentation }>;
  pagination: ActivityLogPagination;
  summary: ActivityLogSummary;
  loading: boolean;
  error: string;
  onPageChange: (page: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Activities');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const typedEntries = entries.map((item) => ({
    ...item,
    activityType: clientActivityType(item.presentation.actionKey),
    status: clientStatusLabel(item.presentation),
  }));

  const typeOptions = ['All Activities', ...Array.from(new Set(typedEntries.map((item) => item.activityType).filter((type) => type !== 'All Activities')))];
  const statusOptions = ['All Statuses', ...Array.from(new Set(typedEntries.map((item) => item.status)))];
  const visibleEntries = typedEntries
    .filter((item) => {
      const searchText = `${item.presentation.summary} ${item.presentation.actionLabel} ${item.presentation.performerName} ${item.status}`.toLowerCase();
      if (query.trim() && !searchText.includes(query.trim().toLowerCase())) return false;
      if (typeFilter !== 'All Activities' && item.activityType !== typeFilter) return false;
      if (statusFilter !== 'All Statuses' && item.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = a.entry.occurredAt ? new Date(a.entry.occurredAt).getTime() : 0;
      const bTime = b.entry.occurredAt ? new Date(b.entry.occurredAt).getTime() : 0;
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

  const dateLabel = (() => {
    const dated = entries
      .map(({ entry }) => entry.occurredAt ? new Date(entry.occurredAt) : null)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());
    if (!dated.length) return 'All time';
    const first = dated[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const last = dated[dated.length - 1].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return first === last ? first : `${first} - ${last}`;
  })();

  const counts = typedEntries.reduce<Record<string, number>>((acc, item) => {
    acc[item.activityType] = (acc[item.activityType] ?? 0) + 1;
    return acc;
  }, {});

  const summaryCards = [
    { label: 'All Activities', value: summary.totalActivities || pagination.total || entries.length, Icon: Waves },
    { label: 'Appointments', value: counts.Appointments ?? 0, Icon: CalendarRange },
    { label: 'Profile', value: counts.Profile ?? 0, Icon: UserCircle2 },
    { label: 'Membership', value: counts.Membership ?? 0, Icon: ShieldCheck },
    { label: 'Payments', value: counts.Payments ?? 0, Icon: CreditCard },
  ];

  function clearClientFilters() {
    setQuery('');
    setTypeFilter('All Activities');
    setStatusFilter('All Statuses');
    setSortOrder('newest');
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 pb-5">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight text-slate-950">{title}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      </div>

      <section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_16px_45px_-34px_rgba(15,23,42,0.34)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(230px,1.15fr)_minmax(210px,0.9fr)_minmax(190px,0.8fr)_minmax(190px,0.8fr)_minmax(220px,0.9fr)_auto]">
          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-slate-600 shadow-sm focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
            <Search size={18} className="shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search activity..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              aria-label="Search activity"
            />
          </label>

          <FilterSelect icon={<CalendarRange size={18} />} label={dateLabel} ariaLabel="Activity date range">
            <option>{dateLabel}</option>
          </FilterSelect>

          <FilterSelect
            icon={<SlidersHorizontal size={18} />}
            label={typeFilter}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            ariaLabel="Activity type"
          >
            {typeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </FilterSelect>

          <FilterSelect
            icon={<Clock3 size={18} />}
            label={statusFilter === 'All Statuses' ? 'Status' : statusFilter}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            ariaLabel="Status"
          >
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </FilterSelect>

          <FilterSelect
            icon={<ArrowUpDown size={18} />}
            label={sortOrder === 'newest' ? 'Sort by: Newest First' : 'Sort by: Oldest First'}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
            ariaLabel="Sort activity"
          >
            <option value="newest">Sort by: Newest First</option>
            <option value="oldest">Sort by: Oldest First</option>
          </FilterSelect>

          <button
            type="button"
            onClick={clearClientFilters}
            className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, value, Icon }, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setTypeFilter(label)}
            className={`group flex min-h-[92px] items-center gap-4 rounded-[14px] border bg-white px-5 py-4 text-left shadow-[0_16px_42px_-35px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-36px_rgba(15,23,42,0.5)] ${typeFilter === label ? clientSummaryTone(index) : 'border-slate-200'}`}
          >
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${clientSummaryTone(index).split(' ').slice(1, 3).join(' ')}`}>
              <Icon size={25} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-600">{label}</span>
              <span className={`mt-1 block text-2xl font-semibold leading-none ${clientValueTone(index)}`}>{value}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_18px_48px_-34px_rgba(15,23,42,0.36)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Recent Activity</h2>
          <p className="mt-0.5 text-sm font-medium text-slate-500">
            {loading ? 'Loading recent events' : `Showing ${visibleEntries.length} recent ${visibleEntries.length === 1 ? 'event' : 'events'}`}
          </p>
        </div>

        {error ? <p className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

        <div className="p-4">
          <div className="overflow-hidden rounded-[12px] border border-slate-200">
            {loading ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 lg:grid-cols-[minmax(0,1.65fr)_130px_150px_210px] lg:items-center">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-full bg-slate-100" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                <div className="h-9 w-44 animate-pulse rounded bg-slate-100" />
              </div>
            )) : null}

            {!loading && !error && !visibleEntries.length ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-50 text-violet-600">
                  <AlertCircle size={24} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">No activity found</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{entries.length ? 'Try clearing filters to see more activity.' : emptyMessage}</p>
                <button
                  type="button"
                  onClick={clearClientFilters}
                  className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear filters
                </button>
              </div>
            ) : null}

            {!loading && !error ? visibleEntries.map(({ entry, presentation, status }) => {
              const Icon = presentation.actionIcon;
              const time = formatDateLabel(entry.occurredAt);
              return (
                <article
                  key={entry.id}
                  className="grid gap-3 border-b border-slate-200 px-4 py-3 transition last:border-b-0 hover:bg-slate-50/70 lg:grid-cols-[minmax(0,1.65fr)_130px_150px_210px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${presentation.iconTone}`}>
                      <Icon size={21} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-950">{presentation.actionLabel}</h3>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-slate-500">{presentation.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center lg:justify-center">
                    <span className={`inline-flex min-w-[84px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${clientStatusTone(status)}`}>
                      {status}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-sm font-medium text-slate-600">
                    <Clock3 size={16} className="mt-0.5 shrink-0 text-slate-500" />
                    <div>
                      <p>{time.day}</p>
                      <p className="text-xs text-slate-500">{time.time}</p>
                    </div>
                  </div>

                  <PersonPill name={presentation.performerName} subtitle={presentation.performerRole} />
                </article>
              );
            }) : null}
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm font-medium text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                disabled={loading || pagination.page <= 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={loading || pagination.page >= pagination.totalPages}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  icon,
  label,
  children,
  value,
  onChange,
  ariaLabel,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  ariaLabel: string;
}) {
  return (
    <label className="relative flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 shadow-sm focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
      <span className="shrink-0 text-slate-500">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
      <ChevronRight size={16} className="rotate-90 text-slate-500" />
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {children}
      </select>
    </label>
  );
}

export default function ActivityLogPage({ title, subtitle, emptyMessage, showAdminFilters = false }: ActivityLogPageProps) {
  const isAdminConsole = showAdminFilters;
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [availableActors, setAvailableActors] = useState<ActivityLogActorOption[]>([]);
  const [pagination, setPagination] = useState<ActivityLogPagination>({
    ...emptyPagination,
    pageSize: isAdminConsole ? 10 : 20,
  });
  const [summary, setSummary] = useState<ActivityLogSummary>(emptySummary);
  const [filters, setFilters] = useState<ActivityLogFilters>({ page: 1, pageSize: isAdminConsole ? 10 : 20 });
  const [adminFilters, setAdminFilters] = useState<AdminFilterState>(defaultAdminFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    getActivityLogs(filters)
      .then((data) => {
        if (!mounted) return;
        setEntries(data.entries);
        setAvailableActors(data.availableActors);
        setPagination(data.pagination);
        setSummary(data.summary);
      })
      .catch((nextError) => {
        if (!mounted) return;
        setEntries([]);
        setAvailableActors([]);
        setPagination({ ...emptyPagination, pageSize: isAdminConsole ? 10 : 20 });
        setSummary(emptySummary);
        setError(nextError instanceof Error ? nextError.message : 'Unable to load activity logs.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [filters, isAdminConsole]);

  const presentedEntries = buildPresentedEntries(entries);
  const activityTypeOptions = Array.from(
    new Map(
      presentedEntries.map(({ presentation }) => [presentation.actionKey, presentation.actionLabel]),
    ).entries(),
  ).map(([value, label]) => ({ value, label }));

  const visibleEntries = presentedEntries.filter(({ presentation }) => {
    if (adminFilters.activityType && presentation.actionKey !== adminFilters.activityType) return false;
    if (adminFilters.severity && presentation.severity !== adminFilters.severity) return false;
    return true;
  });

  const selectedItem = visibleEntries.find(({ entry }) => entry.id === selectedEntryId);
  const hasLocalFilters = Boolean(adminFilters.activityType || adminFilters.severity);
  const pageStart = pagination.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const pageEnd = pagination.total ? pageStart + Math.max(visibleEntries.length - 1, 0) : 0;
  const tableSubtitle = hasLocalFilters
    ? `Showing ${visibleEntries.length} matching activities on this page`
    : `Showing ${pageStart} to ${pageEnd} of ${pagination.total} activities`;

  function updatePage(page: number) {
    setFilters((current) => ({
      ...current,
      page,
    }));
  }

  function applyAdminFilters() {
    const range = rangeForPreset(adminFilters.datePreset);
    setSelectedEntryId(null);
    setFilters({
      page: 1,
      pageSize: 10,
      query: adminFilters.query || undefined,
      actorUserId: adminFilters.performedBy || undefined,
      targetRole: (adminFilters.affectedRole || undefined) as Role | undefined,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    });
  }

  function clearAdminFilters() {
    setAdminFilters(defaultAdminFilters);
    setSelectedEntryId(null);
    setFilters({ page: 1, pageSize: 10 });
  }

  function exportVisibleEntries() {
    if (!visibleEntries.length) return;
    downloadFile(`activity-logs-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(visibleEntries), 'text/csv;charset=utf-8;');
    notifySuccess('Exported the visible activity list.');
  }

  async function copyActivitySummary(item: { entry: ActivityLogEntry; presentation: ActivityPresentation }) {
    const summaryText = `${item.presentation.summary} (${item.presentation.performerName}, ${formatDateLabel(item.entry.occurredAt).day} ${formatDateLabel(item.entry.occurredAt).time})`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summaryText);
      notifySuccess('Copied the activity summary.');
      return;
    }

    toast.error('Clipboard access is not available in this browser.');
  }

  function exportSingleRecord(item: { entry: ActivityLogEntry; presentation: ActivityPresentation }) {
    downloadFile(
      `activity-record-${item.entry.id}.json`,
      JSON.stringify({
        id: item.entry.id,
        summary: item.presentation.summary,
        action: item.presentation.actionLabel,
        severity: item.presentation.severity,
        occurredAt: item.entry.occurredAt,
        performedBy: item.presentation.performerName,
        affected: item.presentation.affectedName,
        details: item.entry.details,
      }, null, 2),
      'application/json;charset=utf-8;',
    );
    notifySuccess('Exported the selected activity record.');
  }

  if (!isAdminConsole) {
    return (
      <StandardFeed
        title={title}
        subtitle={subtitle}
        emptyMessage={emptyMessage}
        entries={presentedEntries}
        pagination={pagination}
        summary={summary}
        loading={loading}
        error={error}
        onPageChange={updatePage}
      />
    );
  }

  const headerTitle = 'Activity Logs';
  const headerSubtitle = 'A clear record of important actions and changes across the platform.';
  const dateRange = rangeForPreset(adminFilters.datePreset);
  const summaryCards = [
    { label: 'Total Activities', value: summary.totalActivities || pagination.total, hint: 'All time', icon: Waves },
    { label: "Today's Activities", value: summary.todayActivities, hint: 'Recorded today', icon: ShieldCheck },
    { label: 'Admins', value: summary.admins, hint: 'Performed activities', icon: UserCircle2 },
    { label: 'Users Affected', value: summary.usersAffected, hint: 'Across all actions', icon: Users },
    { label: 'Critical Actions', value: summary.criticalActions, hint: 'Require attention', icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{headerTitle}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{headerSubtitle}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="inline-flex min-w-[240px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <CalendarRange size={18} className="text-violet-500" />
            <span className="min-w-0 flex-1 truncate">{dateRange.label}</span>
            <select
              value={adminFilters.datePreset}
              onChange={(event) => setAdminFilters((current) => ({ ...current, datePreset: event.target.value as DatePreset }))}
              className="bg-transparent text-right text-sm font-medium text-slate-700 outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </label>
          <button
            type="button"
            onClick={exportVisibleEntries}
            disabled={!visibleEntries.length}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card, index) => (
          <article key={card.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.16)]">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${summaryCardTone(index)}`}>
              <card.icon size={20} />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.16)]">
        <div className="grid gap-3 xl:grid-cols-5">
          <label className="text-sm text-slate-600">
            <span className="mb-2 block font-medium text-slate-700">Search activities</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
              <Search size={16} className="text-slate-400" />
              <input
                value={adminFilters.query}
                onChange={(event) => setAdminFilters((current) => ({ ...current, query: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyAdminFilters();
                }}
                placeholder="Search by person, action, or details..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="text-sm text-slate-600">
            <span className="mb-2 block font-medium text-slate-700">Activity type</span>
            <select
              value={adminFilters.activityType}
              onChange={(event) => setAdminFilters((current) => ({ ...current, activityType: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
            >
              <option value="">All activities</option>
              {activityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            <span className="mb-2 block font-medium text-slate-700">Performed by</span>
            <select
              value={adminFilters.performedBy}
              onChange={(event) => setAdminFilters((current) => ({ ...current, performedBy: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
            >
              <option value="">All users</option>
              {availableActors.map((actor) => (
                <option key={actor.id} value={String(actor.id)}>{actor.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            <span className="mb-2 block font-medium text-slate-700">Affected role</span>
            <select
              value={adminFilters.affectedRole}
              onChange={(event) => setAdminFilters((current) => ({ ...current, affectedRole: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
            >
              <option value="">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{titleCase(role)}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            <span className="mb-2 block font-medium text-slate-700">Severity</span>
            <select
              value={adminFilters.severity}
              onChange={(event) => setAdminFilters((current) => ({ ...current, severity: event.target.value as ActivitySeverity | '' }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
            >
              <option value="">All levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={clearAdminFilters}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FilterX size={16} />
            Clear filters
          </button>
          <button
            type="button"
            onClick={applyAdminFilters}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_-25px_rgba(109,40,217,0.85)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply Filters
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <ActivityDetailCard item={selectedItem} onClose={() => setSelectedEntryId(null)} />

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Activity History</h2>
              <p className="mt-1 text-sm text-slate-500">{tableSubtitle}</p>
            </div>
            <div className="flex items-center gap-2 self-end">
              <button
                type="button"
                onClick={() => updatePage(Math.max(1, pagination.page - 1))}
                disabled={loading || pagination.page <= 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="inline-flex items-center rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
                {pagination.page}
              </div>
              <button
                type="button"
                onClick={() => updatePage(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={loading || pagination.page >= pagination.totalPages}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full table-fixed">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Performed By</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">What Happened</th>
                <th className="px-6 py-4">Affected</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4 text-right">More actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, index) => (
                <tr key={index} className="border-b border-slate-100 last:border-b-0">
                  {Array.from({ length: 8 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-5">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              )) : null}

              {!loading && !visibleEntries.length ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16">
                    <div className="mx-auto max-w-md text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                        <AlertCircle size={22} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-950">No activity found</h3>
                      <p className="mt-2 text-sm text-slate-500">Try changing the filters or date range to see more activity.</p>
                      <button
                        type="button"
                        onClick={clearAdminFilters}
                        className="mt-5 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}

              {!loading ? visibleEntries.map((item) => {
                const time = formatDateLabel(item.entry.occurredAt);
                return (
                  <tr key={item.entry.id} className="border-b border-slate-100 align-top last:border-b-0">
                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-slate-900">{time.day}</p>
                      <p className="mt-1 text-xs text-slate-500">{time.time}</p>
                    </td>
                    <td className="px-6 py-5">
                      <PersonPill name={item.presentation.performerName} subtitle={item.presentation.performerRole} />
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${item.presentation.actionTone}`}>
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${item.presentation.iconTone}`}>
                          <item.presentation.actionIcon size={12} />
                        </span>
                        {item.presentation.actionLabel}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="max-w-md text-sm leading-6 text-slate-700">{item.presentation.summary}</p>
                    </td>
                    <td className="px-6 py-5">
                      {item.presentation.affectedIsPerson ? (
                        <PersonPill name={item.presentation.affectedName} subtitle={item.presentation.affectedMeta} />
                      ) : (
                        <EntityPill name={item.presentation.affectedName} subtitle={item.presentation.affectedMeta} />
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${severityStyles(item.presentation.severity)}`}>
                        {titleCase(item.presentation.severity)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{item.presentation.ipAddress}</td>
                    <td className="px-6 py-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="More actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl border-slate-200 bg-white p-1 shadow-xl">
                          <DropdownMenuItem onClick={() => setSelectedEntryId(item.entry.id)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void copyActivitySummary(item)}>
                            Copy activity summary
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => exportSingleRecord(item)}>
                            Export record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              }) : null}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 p-4 lg:hidden">
          {loading ? Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            </div>
          )) : null}

          {!loading && !visibleEntries.length ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <h3 className="text-lg font-semibold text-slate-950">No activity found</h3>
              <p className="mt-2 text-sm text-slate-500">Try changing the filters or date range to see more activity.</p>
              <button
                type="button"
                onClick={clearAdminFilters}
                className="mt-5 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {!loading ? visibleEntries.map((item) => {
            const time = formatDateLabel(item.entry.occurredAt);
            return (
              <article key={item.entry.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${item.presentation.actionTone}`}>
                      <item.presentation.actionIcon size={14} />
                      {item.presentation.actionLabel}
                    </span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${severityStyles(item.presentation.severity)}`}>
                      {titleCase(item.presentation.severity)}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                        aria-label="More actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl border-slate-200 bg-white p-1 shadow-xl">
                      <DropdownMenuItem onClick={() => setSelectedEntryId(item.entry.id)}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void copyActivitySummary(item)}>
                        Copy activity summary
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportSingleRecord(item)}>
                        Export record
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-700">{item.presentation.summary}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Performed By</p>
                    <div className="mt-3">
                      <PersonPill name={item.presentation.performerName} subtitle={item.presentation.performerRole} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Affected</p>
                    <div className="mt-3">
                      {item.presentation.affectedIsPerson ? (
                        <PersonPill name={item.presentation.affectedName} subtitle={item.presentation.affectedMeta} />
                      ) : (
                        <EntityPill name={item.presentation.affectedName} subtitle={item.presentation.affectedMeta} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Time</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{time.day}</p>
                    <p className="text-xs text-slate-500">{time.time}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">IP Address</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.presentation.ipAddress}</p>
                  </div>
                </div>
              </article>
            );
          }) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-[0_20px_60px_-35px_rgba(76,29,149,0.25)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Need help reading this page?</h3>
            <p className="mt-1 text-sm text-slate-600">Use the filters to focus on a person, role, or time range, then open any row for the full audit details.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
            <CircleHelp size={16} className="text-violet-500" />
            Audit-friendly language is active
          </div>
        </div>
      </section>
    </div>
  );
}
