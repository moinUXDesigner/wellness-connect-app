import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  FileText,
  Filter,
  Headphones,
  Mail,
  MessageCircle,
  Moon,
  MoreVertical,
  Search,
  Settings,
  Shield,
  Sparkles,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Role } from '../../types';
import {
  calculateAdminNotificationOverview,
  buildAdminNotificationViewModels,
  groupAdminNotifications,
  notificationMatchesFilter,
  overviewCardIcon,
  overviewCardTone,
  severityBadgeStyles,
  tabIcon,
  type AdminNotificationFilter,
  type AdminNotificationOverview,
  type AdminNotificationSort,
  type AdminNotificationViewModel,
} from './adminNotificationPresentation';
import {
  getCounsellorNotifications,
  getNotifications,
  markAllNotificationsRead,
  notifyUnreadCountChanged,
  notificationCategoryLabel,
  updateNotification,
  type AppNotification,
  type CounsellorNotificationCategory,
  type CounsellorNotificationItem,
  type CounsellorNotificationsResponse,
  type CounsellorNotificationPriority,
} from './notificationsApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { notifyError, notifySuccess, toast } from '../shared/lib/toast';

const roleCopy: Record<Role, { title: string; description: string; empty: string }> = {
  admin: {
    title: 'Admin Notifications',
    description: 'Escalations, workflow updates, approvals, and system-level operational alerts.',
    empty: 'No admin notifications right now.',
  },
  client: {
    title: 'Client Notifications',
    description: 'Track intake, appointments, memberships, and account-related updates.',
    empty: 'No client notifications yet.',
  },
  counsellor: {
    title: 'Counsellor Notifications',
    description: 'Session, client, and care coordination updates visible to counsellors.',
    empty: 'No counsellor notifications right now.',
  },
  trainer: {
    title: 'Trainer Notifications',
    description: 'Review follow-ups, safety alerts, adherence issues, and training updates.',
    empty: 'No trainer notifications right now.',
  },
  coach: {
    title: 'Coach Notifications',
    description: 'Goal-related and coaching workflow updates will appear here.',
    empty: 'No coach notifications right now.',
  },
  helpdesk: {
    title: 'Help Desk Notifications',
    description: 'Support escalations, workflow events, and operational updates.',
    empty: 'No help desk notifications right now.',
  },
  finance: {
    title: 'Finance Notifications',
    description: 'Billing, payment, and finance operations updates will appear here.',
    empty: 'No finance notifications right now.',
  },
  legal: {
    title: 'Legal Notifications',
    description: 'Policy, review, and legal workflow updates will appear here.',
    empty: 'No legal notifications right now.',
  },
  content: {
    title: 'Content Notifications',
    description: 'Content publishing and asset workflow updates will appear here.',
    empty: 'No content notifications right now.',
  },
};

type NotificationData = {
  unreadCount: number;
  items: AppNotification[];
};

type StandardFilterKey = 'all' | 'unread' | 'read';

const adminFilters: Array<{ key: AdminNotificationFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'escalations', label: 'Escalations' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'system', label: 'System' },
];

const quickActions = [
  {
    title: 'Review escalations',
    description: 'Resolve high-risk operational cases.',
    to: '/admin/escalations',
  },
  {
    title: 'Pending approvals',
    description: 'Open the active approval and application queue.',
    to: '/admin/approvals',
  },
  {
    title: 'System health',
    description: 'Check live service and platform status.',
    to: '/admin/health',
  },
  {
    title: 'Workflow updates',
    description: 'Review workflow configuration and automation.',
    to: '/admin/workflows',
  },
];

type ClientNotificationCategory = 'all' | 'appointments' | 'messages' | 'membership' | 'billing' | 'reminders';
type ClientNotificationSort = 'newest' | 'oldest';

type ClientNotificationViewModel = {
  notification: AppNotification;
  title: string;
  message: string;
  category: ClientNotificationCategory;
  label: string;
  read: boolean;
  group: 'today' | 'earlier';
  dateLabel: string;
  timeLabel: string;
  Icon: typeof Bell;
  dotClass: string;
  iconClass: string;
  badgeClass: string;
  actionClass: string;
  ctaLabel: string;
};

const clientFilterTabs: Array<{ key: ClientNotificationCategory | 'unread' | 'read'; label: string; icon?: ReactNode }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'appointments', label: 'Appointments', icon: <Calendar size={17} /> },
  { key: 'messages', label: 'Messages', icon: <MessageCircle size={17} /> },
  { key: 'membership', label: 'Membership', icon: <UserCircle2 size={17} /> },
  { key: 'billing', label: 'Billing', icon: <FileText size={17} /> },
  { key: 'reminders', label: 'Reminders', icon: <Bell size={17} /> },
];

function clientCategoryForType(type: string): ClientNotificationCategory {
  const normalized = type.toLowerCase();
  if (normalized.includes('appointment') || normalized.includes('session') || normalized.includes('booking')) return 'appointments';
  if (normalized.includes('message') || normalized.includes('chat')) return 'messages';
  if (normalized.includes('member') || normalized.includes('plan') || normalized.includes('subscription')) return 'membership';
  if (normalized.includes('billing') || normalized.includes('payment') || normalized.includes('receipt') || normalized.includes('invoice')) return 'billing';
  if (normalized.includes('reminder') || normalized.includes('check') || normalized.includes('follow')) return 'reminders';
  return 'reminders';
}

function clientNotificationVisual(category: ClientNotificationCategory) {
  if (category === 'appointments') {
    return {
      Icon: Calendar,
      dotClass: 'bg-violet-600',
      iconClass: 'bg-violet-100 text-violet-600',
      badgeClass: 'bg-violet-100 text-violet-700',
      actionClass: 'border-violet-300 text-violet-700 hover:bg-violet-50',
      ctaLabel: 'View Details',
    };
  }
  if (category === 'messages') {
    return {
      Icon: MessageCircle,
      dotClass: 'bg-blue-600',
      iconClass: 'bg-blue-100 text-blue-600',
      badgeClass: 'bg-blue-100 text-blue-700',
      actionClass: 'border-blue-300 text-blue-700 hover:bg-blue-50',
      ctaLabel: 'Reply',
    };
  }
  if (category === 'membership') {
    return {
      Icon: UserCircle2,
      dotClass: 'bg-emerald-600',
      iconClass: 'bg-emerald-100 text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      actionClass: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
      ctaLabel: 'View Details',
    };
  }
  if (category === 'billing') {
    return {
      Icon: FileText,
      dotClass: 'bg-orange-500',
      iconClass: 'bg-orange-100 text-orange-600',
      badgeClass: 'bg-orange-100 text-orange-700',
      actionClass: 'border-orange-300 text-orange-700 hover:bg-orange-50',
      ctaLabel: 'View Receipt',
    };
  }

  return {
    Icon: Bell,
    dotClass: 'bg-amber-500',
    iconClass: 'bg-amber-100 text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700',
    actionClass: 'border-amber-300 text-amber-700 hover:bg-amber-50',
    ctaLabel: 'Check In',
  };
}

function notificationTitleForClient(notification: AppNotification, category: ClientNotificationCategory) {
  const label = notificationCategoryLabel(notification.type);
  const message = notification.message.trim();
  if (message.includes(':')) return message.split(':')[0].trim();
  if (category === 'appointments') return label.toLowerCase().includes('no-show') ? 'Appointment update' : 'Booking confirmed';
  if (category === 'messages') return 'New message received';
  if (category === 'membership') return 'Membership renewal reminder';
  if (category === 'billing') return 'Payment receipt available';
  return label;
}

function formatClientNotificationDate(value: string | null) {
  if (!value) return { dateLabel: 'Date unavailable', timeLabel: '' };
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (startOfDate === startOfToday) return { dateLabel: 'Today', timeLabel };
  if (startOfDate === startOfToday - 24 * 60 * 60 * 1000) return { dateLabel: 'Yesterday', timeLabel };
  return {
    dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    timeLabel,
  };
}

function buildClientNotificationViewModel(notification: AppNotification): ClientNotificationViewModel {
  const category = clientCategoryForType(notification.type);
  const visual = clientNotificationVisual(category);
  const date = formatClientNotificationDate(notification.createdAt);
  const message = notification.message.includes(':')
    ? notification.message.split(':').slice(1).join(':').trim() || notification.message
    : notification.message;

  return {
    notification,
    title: notificationTitleForClient(notification, category),
    message,
    category,
    label: notificationCategoryLabel(notification.type),
    read: notification.read,
    group: date.dateLabel === 'Today' ? 'today' : 'earlier',
    dateLabel: date.dateLabel,
    timeLabel: date.timeLabel,
    ...visual,
  };
}

type CounsellorNotificationFilter = 'all' | CounsellorNotificationCategory;

const counsellorFilterTabs: Array<{ key: CounsellorNotificationFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'clients', label: 'Clients' },
  { key: 'cbt_care', label: 'CBT Care' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'system', label: 'System' },
];

function CounsellorNotificationsActionCenter({
  data,
  loading,
  filter,
  search,
  markAllPending,
  onFilterChange,
  onSearchChange,
  onMarkAllRead,
  onToggleRead,
  onOpenAction,
}: {
  data: CounsellorNotificationsResponse | null;
  loading: boolean;
  filter: CounsellorNotificationFilter;
  search: string;
  markAllPending: boolean;
  onFilterChange: (filter: CounsellorNotificationFilter) => void;
  onSearchChange: (value: string) => void;
  onMarkAllRead: () => Promise<void>;
  onToggleRead: (item: CounsellorNotificationItem) => Promise<void>;
  onOpenAction: (path: string) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const items = data?.items ?? [];
  const unreadNotificationRows = items.filter((item) => item.notificationId && !item.read).length;
  const filteredItems = useMemo(() => items.filter((item) => {
    if (filter !== 'all' && item.category !== filter) return false;
    if (search.trim()) {
      const text = `${item.title} ${item.message} ${item.clientName ?? ''} ${item.category} ${item.priority}`.toLowerCase();
      if (!text.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  }), [filter, items, search]);

  const tabCounts = counsellorFilterTabs.reduce<Record<string, number>>((counts, tab) => {
    counts[tab.key] = tab.key === 'all' ? items.length : items.filter((item) => item.category === tab.key).length;
    return counts;
  }, {});

  const summary = data?.summary ?? {
    unread: 0,
    clientActivity: 0,
    todaysReminders: 0,
    urgentAlerts: 0,
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-700">Counsellor Action Center</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">Prioritized clinical alerts, session actions, client activity, and CBT care updates.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onMarkAllRead()}
            disabled={markAllPending || unreadNotificationRows === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <CheckCheck size={17} />
            {markAllPending ? 'Updating...' : 'Mark All Read'}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Settings size={17} />
            Notification Settings
          </button>
          <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Filter size={17} />
            Filter
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CounsellorSummaryCard icon={<Mail size={18} />} label="Unread" value={summary.unread} tone="violet" />
        <CounsellorSummaryCard icon={<Users size={18} />} label="Client Activity" value={summary.clientActivity} tone="blue" />
        <CounsellorSummaryCard icon={<Calendar size={18} />} label="Today's Reminders" value={summary.todaysReminders} tone="amber" />
        <CounsellorSummaryCard icon={<Shield size={18} />} label="Urgent Alerts" value={summary.urgentAlerts} tone="rose" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {counsellorFilterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onFilterChange(tab.key)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                filter === tab.key ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>{tabCounts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {filtersOpen ? (
          <label className="mt-3 flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by client, priority, category, or message"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        ) : null}
      </section>

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : null}

      {!loading && !filteredItems.length ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Bell size={28} className="mx-auto text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">No action items found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{items.length ? 'Try another category or clear the search filter.' : 'Your counsellor action center is clear right now.'}</p>
        </section>
      ) : null}

      {!loading && filteredItems.length ? (
        <section className="space-y-3">
          {filteredItems.map((item) => (
            <CounsellorNotificationCard
              key={item.id}
              item={item}
              onToggleRead={onToggleRead}
              onOpenAction={onOpenAction}
            />
          ))}
        </section>
      ) : null}

      <CounsellorNotificationSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function CounsellorSummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'violet' | 'blue' | 'amber' | 'rose' }) {
  const styles = {
    violet: 'bg-violet-50 text-violet-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  } as const;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`inline-flex size-10 items-center justify-center rounded-xl ${styles[tone]}`}>{icon}</span>
      <p className="mt-4 text-3xl font-semibold leading-none text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </article>
  );
}

function CounsellorNotificationCard({ item, onToggleRead, onOpenAction }: { item: CounsellorNotificationItem; onToggleRead: (item: CounsellorNotificationItem) => Promise<void>; onOpenAction: (path: string) => void }) {
  const visual = counsellorNotificationVisual(item.category, item.priority);
  const Icon = visual.Icon;

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${item.read ? 'border-slate-200' : visual.borderClass}`}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 gap-4">
          <span className={`mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${visual.iconClass}`}>
            <Icon size={21} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {!item.read ? <span className="size-2 rounded-full bg-violet-600" /> : null}
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${visual.priorityClass}`}>{labelFromNotificationValue(item.priority)}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{labelFromNotificationValue(item.category)}</span>
              <span className="text-xs font-semibold text-slate-400">{formatCounsellorRelativeTime(item.createdAt)}</span>
            </div>
            <h2 className="mt-2 text-base font-semibold text-slate-950">{item.title}</h2>
            {item.clientName ? <p className="mt-1 text-sm font-semibold text-slate-700">{item.clientName}</p> : null}
            <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {item.actionRoute ? (
            <button type="button" onClick={() => onOpenAction(item.actionRoute as string)} className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white ${visual.buttonClass}`}>
              {item.actionLabel}
            </button>
          ) : null}
          {item.notificationId ? (
            <button type="button" onClick={() => void onToggleRead(item)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {item.read ? 'Mark Unread' : 'Mark Read'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CounsellorNotificationSettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState({
    clinical: true,
    sessions: true,
    cbt: true,
    clients: true,
    system: false,
  });

  if (!open) return null;

  const rows = [
    { key: 'clinical', label: 'Clinical alerts' },
    { key: 'sessions', label: 'Session reminders' },
    { key: 'cbt', label: 'CBT care' },
    { key: 'clients', label: 'Client activity' },
    { key: 'system', label: 'System updates' },
  ] as const;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/30 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-[min(100vw,420px)] flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Notification Settings</h2>
            <p className="mt-1 text-sm text-slate-500">Local preference preview for this workspace.</p>
          </div>
          <button type="button" aria-label="Close notification settings" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 p-5">
          {rows.map((row) => (
            <label key={row.key} className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-slate-200 px-4">
              <span className="text-sm font-semibold text-slate-700">{row.label}</span>
              <input
                type="checkbox"
                checked={settings[row.key]}
                onChange={(event) => setSettings((current) => ({ ...current, [row.key]: event.target.checked }))}
                className="h-5 w-5 accent-violet-600"
              />
            </label>
          ))}
        </div>
      </aside>
    </div>
  );
}

function counsellorNotificationVisual(category: CounsellorNotificationCategory, priority: CounsellorNotificationPriority) {
  const priorityStyles = {
    critical: {
      priorityClass: 'bg-rose-100 text-rose-700',
      borderClass: 'border-rose-300 ring-1 ring-rose-100',
      buttonClass: 'bg-rose-600 hover:bg-rose-700',
    },
    high: {
      priorityClass: 'bg-orange-100 text-orange-700',
      borderClass: 'border-orange-300 ring-1 ring-orange-100',
      buttonClass: 'bg-orange-600 hover:bg-orange-700',
    },
    medium: {
      priorityClass: 'bg-blue-100 text-blue-700',
      borderClass: 'border-blue-200',
      buttonClass: 'bg-violet-600 hover:bg-violet-700',
    },
    low: {
      priorityClass: 'bg-slate-100 text-slate-600',
      borderClass: 'border-slate-200',
      buttonClass: 'bg-slate-700 hover:bg-slate-800',
    },
  } as const;

  const categoryStyles = {
    urgent: { Icon: AlertTriangle, iconClass: 'bg-rose-50 text-rose-600' },
    sessions: { Icon: Calendar, iconClass: 'bg-orange-50 text-orange-600' },
    clients: { Icon: Users, iconClass: 'bg-blue-50 text-blue-600' },
    cbt_care: { Icon: ClipboardCheck, iconClass: 'bg-emerald-50 text-emerald-600' },
    system: { Icon: Bell, iconClass: 'bg-slate-100 text-slate-600' },
  } as const;

  return { ...categoryStyles[category], ...priorityStyles[priority] };
}

function formatCounsellorRelativeTime(value: string | null) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const absMinutes = Math.abs(Math.round(diffMs / 60000));
  if (absMinutes < 1) return 'Now';
  if (diffMs < 0) {
    if (absMinutes < 60) return `In ${absMinutes} min`;
    return `In ${Math.round(absMinutes / 60)} hr`;
  }
  if (absMinutes < 60) return `${absMinutes} min ago`;
  if (absMinutes < 1440) return `${Math.round(absMinutes / 60)} hr ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function labelFromNotificationValue(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StandardNotificationsPage({
  data,
  loading,
  filter,
  sort,
  search,
  markAllPending,
  onFilterChange,
  onSortChange,
  onSearchChange,
  onMarkAllRead,
  onToggleRead,
  role,
}: {
  data: NotificationData | null;
  loading: boolean;
  filter: StandardFilterKey | ClientNotificationCategory;
  sort: ClientNotificationSort;
  search: string;
  markAllPending: boolean;
  onFilterChange: (filter: StandardFilterKey | ClientNotificationCategory) => void;
  onSortChange: (sort: ClientNotificationSort) => void;
  onSearchChange: (value: string) => void;
  onMarkAllRead: () => Promise<void>;
  onToggleRead: (notification: AppNotification) => Promise<void>;
  role: Role;
}) {
  const copy = roleCopy[role];
  const items = useMemo(() => (data?.items ?? []).map(buildClientNotificationViewModel), [data]);
  const filteredItems = useMemo(
    () => items
      .filter((item) => {
        if (filter === 'unread' && item.read) return false;
        if (filter === 'read' && !item.read) return false;
        if (!['all', 'unread', 'read'].includes(filter) && item.category !== filter) return false;
        if (search.trim()) {
          const text = `${item.title} ${item.message} ${item.label}`.toLowerCase();
          if (!text.includes(search.trim().toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aTime = a.notification.createdAt ? new Date(a.notification.createdAt).getTime() : 0;
        const bTime = b.notification.createdAt ? new Date(b.notification.createdAt).getTime() : 0;
        return sort === 'newest' ? bTime - aTime : aTime - bTime;
      }),
    [filter, items, search, sort],
  );

  const unreadCount = data?.unreadCount ?? items.filter((item) => !item.read).length;
  const counts = {
    all: items.length,
    unread: unreadCount,
    read: items.filter((item) => item.read).length,
    appointments: items.filter((item) => item.category === 'appointments').length,
    messages: items.filter((item) => item.category === 'messages').length,
    membership: items.filter((item) => item.category === 'membership').length,
    billing: items.filter((item) => item.category === 'billing').length,
    reminders: items.filter((item) => item.category === 'reminders').length,
  };

  const overviewCards = [
    { label: 'Total', value: counts.all, Icon: Bell, tone: 'bg-violet-100 text-violet-600' },
    { label: 'Unread', value: counts.unread, Icon: Mail, tone: 'bg-purple-100 text-purple-600' },
    { label: 'Messages', value: counts.messages, Icon: MessageCircle, tone: 'bg-emerald-100 text-emerald-600' },
    { label: 'Appointments', value: counts.appointments, Icon: Calendar, tone: 'bg-blue-100 text-blue-600' },
  ];

  const todayItems = filteredItems.filter((item) => item.group === 'today');
  const earlierItems = filteredItems.filter((item) => item.group === 'earlier');

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Workspace Inbox</p>
        <h1 className="mt-1 text-[30px] font-semibold leading-tight text-slate-950">{copy.title}</h1>
        <p className="mt-2 text-base font-medium text-slate-500">{copy.description}</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <section className="mb-6 flex flex-wrap gap-3">
            {clientFilterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-[16px] border px-4 text-sm font-semibold transition ${
                  filter === tab.key
                    ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-[0_16px_36px_-30px_rgba(109,40,217,0.9)]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {(tab.key === 'unread' && counts.unread > 0) ? (
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{counts.unread}</span>
                ) : null}
              </button>
            ))}
          </section>

          <section className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 shadow-sm focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
              <Search size={17} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search notifications..."
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="relative flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-slate-700 shadow-sm">
              <ArrowUpDown size={17} className="text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{sort === 'newest' ? 'Newest first' : 'Oldest first'}</span>
              <ChevronRight size={16} className="rotate-90 text-slate-400" />
              <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value as ClientNotificationSort)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Sort notifications"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void onMarkAllRead()}
              disabled={markAllPending || !unreadCount}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white shadow-[0_18px_42px_-24px_rgba(109,40,217,0.85)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <CheckCircleIcon />
              {markAllPending ? 'Updating...' : 'Mark all as read'}
            </button>
          </section>

          {loading && !data ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-[14px] border border-slate-200 bg-white" />
              ))}
            </div>
          ) : null}

          {!loading && !filteredItems.length ? (
            <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <Bell size={26} className="mx-auto text-slate-400" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">No notifications found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{items.length ? 'Try clearing the search or choosing a broader inbox filter.' : copy.empty}</p>
            </div>
          ) : null}

          {!loading && filteredItems.length ? (
            <div className="space-y-5">
              <NotificationGroup
                title="Today"
                countLabel={todayItems.filter((item) => !item.read).length ? `${todayItems.filter((item) => !item.read).length} unread` : undefined}
                items={todayItems}
                onToggleRead={onToggleRead}
              />
              <NotificationGroup
                title="Earlier"
                items={earlierItems}
                onToggleRead={onToggleRead}
              />
              <div className="flex justify-center pt-1">
                <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  Load more
                  <ChevronRight size={16} className="rotate-90" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)]">
            <h2 className="text-lg font-semibold text-slate-950">Notification Overview</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {overviewCards.map(({ label, value, Icon, tone }) => (
                <article key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${tone}`}>
                    <Icon size={18} />
                  </span>
                  <p className="mt-4 text-2xl font-semibold leading-none text-slate-950">{value}</p>
                  <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)]">
            <h2 className="text-lg font-semibold text-slate-950">Quick Actions</h2>
            <div className="mt-5 space-y-1">
              <QuickAction icon={<Settings size={18} />} label="Manage notification preferences" />
              <QuickAction icon={<Clock3 size={18} />} label="Notification history" />
              <QuickAction icon={<Moon size={18} />} label="Do not disturb" detail="Off" />
              <QuickAction icon={<Headphones size={18} />} label="Contact support" />
            </div>
          </section>

          <section className="rounded-[14px] border border-violet-200 bg-[linear-gradient(135deg,#fbfaff_0%,#f1eaff_100%)] p-5 shadow-[0_18px_48px_-36px_rgba(109,40,217,0.45)]">
            <div className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-violet-600 shadow-sm">
                <Sparkles size={22} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-violet-800">Stay in the loop</h2>
                <p className="mt-2 text-sm leading-6 text-violet-700/80">Enable push notifications to get real-time updates on your appointments and messages.</p>
                <button type="button" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700">
                  Enable now
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full border border-white/70">
      <Check size={13} />
    </span>
  );
}

function NotificationGroup({
  title,
  countLabel,
  items,
  onToggleRead,
}: {
  title: string;
  countLabel?: string;
  items: ClientNotificationViewModel[];
  onToggleRead: (notification: AppNotification) => Promise<void>;
}) {
  if (!items.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-3 px-1">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {countLabel ? <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{countLabel}</span> : null}
      </div>
      <div className="space-y-0">
        {items.map((item) => (
          <article
            key={item.notification.id}
            className={`grid gap-4 border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_42px_-36px_rgba(15,23,42,0.4)] first:rounded-t-[14px] last:rounded-b-[14px] lg:grid-cols-[minmax(0,1fr)_132px] lg:items-center ${
              item.read ? '' : 'border-violet-300 ring-1 ring-violet-200'
            }`}
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className={`hidden h-2.5 w-2.5 shrink-0 rounded-full ${item.read ? 'bg-slate-300' : item.dotClass} sm:block`} />
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${item.iconClass}`}>
                <item.Icon size={24} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <h3 className="truncate text-base font-semibold text-slate-950">{item.title}</h3>
                  <span className="text-sm font-medium text-slate-500 sm:ml-auto lg:hidden">{item.dateLabel === 'Today' ? item.timeLabel : `${item.dateLabel}, ${item.timeLabel}`}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{item.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.badgeClass}`}>{item.label}</span>
                  <span className="hidden items-center gap-1 text-sm font-medium text-slate-500 sm:inline-flex">
                    <Clock3 size={15} />
                    {item.dateLabel === 'Today' ? item.timeLabel : `${item.dateLabel}, ${item.timeLabel}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => void onToggleRead(item.notification)}
                className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border bg-white px-4 text-sm font-semibold transition lg:flex-none ${item.actionClass}`}
              >
                {item.read ? 'Mark Unread' : item.ctaLabel}
              </button>
              {!item.read ? (
                <button
                  type="button"
                  onClick={() => void onToggleRead(item.notification)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                  aria-label="Mark notification as read"
                >
                  <CheckCheck size={17} />
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuickAction({ icon, label, detail }: { icon: ReactNode; label: string; detail?: string }) {
  return (
    <button type="button" className="flex min-h-12 w-full items-center gap-3 rounded-lg px-1 text-left transition hover:bg-slate-50">
      <span className="shrink-0 text-slate-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-700">{label}</span>
        {detail ? <span className="block text-xs text-slate-400">{detail}</span> : null}
      </span>
      <ChevronRight size={16} className="text-slate-500" />
    </button>
  );
}

function OverviewCard({
  label,
  value,
  cardKey,
}: {
  label: string;
  value: number;
  cardKey: keyof AdminNotificationOverview;
}) {
  const Icon = overviewCardIcon(cardKey);

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.22)]">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${overviewCardTone(cardKey)}`}>
        <Icon size={18} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    </article>
  );
}

function AdminNotificationsPage({
  data,
  loading,
  filter,
  sort,
  search,
  actingNotificationId,
  markAllPending,
  onFilterChange,
  onSortChange,
  onSearchChange,
  onMarkAllRead,
  onToggleRead,
  onCopySummary,
  onOpenRelatedPage,
}: {
  data: NotificationData | null;
  loading: boolean;
  filter: AdminNotificationFilter;
  sort: AdminNotificationSort;
  search: string;
  actingNotificationId: number | null;
  markAllPending: boolean;
  onFilterChange: (filter: AdminNotificationFilter) => void;
  onSortChange: (sort: AdminNotificationSort) => void;
  onSearchChange: (value: string) => void;
  onMarkAllRead: () => Promise<void>;
  onToggleRead: (notification: AppNotification) => Promise<void>;
  onCopySummary: (item: AdminNotificationViewModel) => Promise<void>;
  onOpenRelatedPage: (path: string) => void;
}) {
  const adminItems = useMemo(() => buildAdminNotificationViewModels(data?.items ?? []), [data]);
  const overview = useMemo(() => calculateAdminNotificationOverview(adminItems), [adminItems]);
  const visibleItems = useMemo(
    () => adminItems.filter((item) => notificationMatchesFilter(item, filter, search)),
    [adminItems, filter, search],
  );
  const groupedItems = useMemo(() => groupAdminNotifications(visibleItems, sort), [visibleItems, sort]);

  const filterCounts = useMemo(
    () => ({
      all: adminItems.length,
      unread: adminItems.filter((item) => !item.read).length,
      read: adminItems.filter((item) => item.read).length,
      escalations: adminItems.filter((item) => item.category === 'escalations').length,
      approvals: adminItems.filter((item) => item.category === 'approvals').length,
      system: adminItems.filter((item) => item.category === 'system').length,
    }),
    [adminItems],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#f7f4ff_45%,#eef6ff_100%)] p-6 shadow-[0_26px_80px_-46px_rgba(76,29,149,0.35)] sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Workspace Inbox</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">Admin Notifications</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Escalations, workflow updates, approvals, and system-level operational alerts.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm shadow-sm backdrop-blur">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Bell size={18} />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Unread</p>
                <p className="text-base font-semibold text-slate-950">{data?.unreadCount ?? 0} in queue</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onMarkAllRead()}
              disabled={markAllPending || !data?.unreadCount}
              className="inline-flex h-[58px] items-center justify-center rounded-2xl bg-violet-600 px-6 text-sm font-semibold text-white shadow-[0_20px_50px_-25px_rgba(109,40,217,0.85)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markAllPending ? 'Marking...' : 'Mark all as read'}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)] sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {adminFilters.map((option) => {
                  const Icon = tabIcon(option.key);
                  const count = filterCounts[option.key];
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => onFilterChange(option.key)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                        filter === option.key
                          ? 'border-violet-200 bg-violet-600 text-white shadow-[0_18px_40px_-28px_rgba(109,40,217,0.8)]'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={15} />
                      <span>{option.label}</span>
                      <span
                        className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] ${
                          filter === option.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] xl:min-w-[500px]">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search notifications..."
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <ArrowUpDown size={16} className="text-slate-400" />
                  <select
                    value={sort}
                    onChange={(event) => onSortChange(event.target.value as AdminNotificationSort)}
                    className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 className="text-xl font-semibold text-slate-950">Notification feed</h2>
              <p className="mt-1 text-sm text-slate-500">
                {visibleItems.length} visible notification{visibleItems.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              {loading && !data ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  </div>
                ))
              ) : null}

              {!loading && !adminItems.length ? (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <Bell size={26} className="mx-auto text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">The admin inbox is quiet right now</h3>
                  <p className="mt-2 text-sm text-slate-500">New escalations, approvals, workflow changes, and system alerts will appear here.</p>
                </div>
              ) : null}

              {!loading && adminItems.length && !visibleItems.length ? (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <Search size={24} className="mx-auto text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">No notifications match those filters</h3>
                  <p className="mt-2 text-sm text-slate-500">Try a different search term or switch back to a broader inbox segment.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange('all');
                      onSearchChange('');
                    }}
                    className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}

              {!loading ? groupedItems.map((group) => (
                <div key={group.key}>
                  <h3 className="mb-3 text-lg font-semibold text-slate-950">{group.title}</h3>
                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const matchingNotification = data?.items.find((notification) => notification.id === item.id);
                      const Icon = item.icon;
                      const isRowPending = actingNotificationId === item.id;

                      return (
                        <article
                          key={item.id}
                          className={`rounded-[24px] border p-4 transition sm:p-5 ${
                            item.read ? 'border-slate-200 bg-white' : item.accent.card
                          }`}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-4">
                                <span className={`mt-2 hidden h-2.5 w-2.5 rounded-full ${item.read ? 'bg-slate-300' : item.accent.dot} sm:block`} />
                                <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.accent.icon}`}>
                                  <Icon size={18} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-950">{item.title}</span>
                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${severityBadgeStyles(item.severity)}`}>
                                      {item.severityLabel}
                                    </span>
                                    {!item.read ? (
                                      <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                                        Unread
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 text-sm font-medium text-slate-500">{item.label}</p>
                                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.message}</p>
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px]">
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Related</p>
                                      <p className="mt-2 truncate text-sm font-semibold text-slate-900">{item.entityName}</p>
                                      <p className="truncate text-xs text-slate-500">{item.entityMeta}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Received</p>
                                      <p className="mt-2 text-sm font-semibold text-slate-900">{item.timeLabel}</p>
                                      <p className="text-xs text-slate-500">{item.dateLabel}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 lg:w-[220px] lg:items-end">
                              <button
                                type="button"
                                onClick={() => onOpenRelatedPage(item.relatedPath)}
                                className={`inline-flex min-h-[44px] items-center justify-center rounded-2xl border bg-white px-4 py-2.5 text-sm font-semibold transition ${item.accent.action}`}
                              >
                                {item.ctaLabel}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (matchingNotification) {
                                    void onToggleRead(matchingNotification);
                                  }
                                }}
                                disabled={isRowPending || !matchingNotification}
                                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {item.read ? <Check size={15} /> : <CheckCheck size={15} />}
                                {isRowPending ? 'Updating...' : item.read ? 'Mark unread' : 'Mark read'}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center self-end rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                    aria-label="More notification actions"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-200 bg-white p-1 shadow-xl">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (matchingNotification) {
                                        void onToggleRead(matchingNotification);
                                      }
                                    }}
                                  >
                                    {item.read ? 'Mark as unread' : 'Mark as read'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void onCopySummary(item)}>
                                    Copy summary
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onOpenRelatedPage(item.relatedPath)}>
                                    Open related page
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)]">
            <h2 className="text-xl font-semibold text-slate-950">Notification Overview</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <OverviewCard label="Total notifications" value={overview.total} cardKey="total" />
              <OverviewCard label="Unread" value={overview.unread} cardKey="unread" />
              <OverviewCard label="Escalations" value={overview.escalations} cardKey="escalations" />
              <OverviewCard label="Approvals pending" value={overview.approvals} cardKey="approvals" />
              <OverviewCard label="System alerts" value={overview.system} cardKey="system" />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)]">
            <h2 className="text-xl font-semibold text-slate-950">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.to}
                  type="button"
                  onClick={() => onOpenRelatedPage(action.to)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.16)]">
            <h2 className="text-xl font-semibold text-slate-950">Notification Preferences</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Preference controls are not available in this workspace yet, but this panel is reserved for delivery and routing settings.
            </p>
            <button
              type="button"
              disabled
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-violet-200/70 px-4 text-sm font-semibold text-violet-700 opacity-80"
            >
              Preferences coming soon
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function NotificationsPage({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [data, setData] = useState<NotificationData | null>(null);
  const [counsellorData, setCounsellorData] = useState<CounsellorNotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [standardFilter, setStandardFilter] = useState<StandardFilterKey | ClientNotificationCategory>('all');
  const [standardSort, setStandardSort] = useState<ClientNotificationSort>('newest');
  const [standardSearch, setStandardSearch] = useState('');
  const [counsellorFilter, setCounsellorFilter] = useState<CounsellorNotificationFilter>('all');
  const [counsellorSearch, setCounsellorSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState<AdminNotificationFilter>('all');
  const [adminSort, setAdminSort] = useState<AdminNotificationSort>('newest');
  const [adminSearch, setAdminSearch] = useState('');
  const [actingNotificationId, setActingNotificationId] = useState<number | null>(null);
  const [markAllPending, setMarkAllPending] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      if (role === 'counsellor') {
        setCounsellorData(await getCounsellorNotifications());
      } else {
        setData(await getNotifications());
      }
    } catch (error) {
      notifyError(error, 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [role]);

  async function handleToggleRead(notification: AppNotification) {
    setActingNotificationId(notification.id);
    try {
      await updateNotification(notification.id, !notification.read);
      await refresh();
      notifyUnreadCountChanged();
      notifySuccess(notification.read ? 'Notification marked as unread.' : 'Notification marked as read.');
    } catch (error) {
      notifyError(error, 'Unable to update notification.');
    } finally {
      setActingNotificationId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkAllPending(true);
    try {
      const result = await markAllNotificationsRead();
      await refresh();
      notifyUnreadCountChanged();
      notifySuccess(result.message);
    } catch (error) {
      notifyError(error, 'Unable to update notifications.');
    } finally {
      setMarkAllPending(false);
    }
  }

  async function handleCounsellorToggleRead(item: CounsellorNotificationItem) {
    if (!item.notificationId) return;

    setActingNotificationId(item.notificationId);
    try {
      await updateNotification(item.notificationId, !item.read);
      await refresh();
      notifyUnreadCountChanged();
      notifySuccess(item.read ? 'Notification marked as unread.' : 'Notification marked as read.');
    } catch (error) {
      notifyError(error, 'Unable to update notification.');
    } finally {
      setActingNotificationId(null);
    }
  }

  async function handleCopySummary(item: AdminNotificationViewModel) {
    const summary = `${item.title}: ${item.message} (${item.entityName} | ${item.timeLabel} ${item.dateLabel})`;
    if (!navigator.clipboard?.writeText) {
      toast.error('Clipboard access is not available in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(summary);
      notifySuccess('Notification summary copied.');
    } catch (error) {
      notifyError(error, 'Unable to copy the notification summary.');
    }
  }

  function handleOpenRelatedPage(path: string) {
    navigate(path);
  }

  if (role === 'counsellor') {
    return (
      <CounsellorNotificationsActionCenter
        data={counsellorData}
        loading={loading}
        filter={counsellorFilter}
        search={counsellorSearch}
        markAllPending={markAllPending}
        onFilterChange={setCounsellorFilter}
        onSearchChange={setCounsellorSearch}
        onMarkAllRead={handleMarkAllRead}
        onToggleRead={handleCounsellorToggleRead}
        onOpenAction={handleOpenRelatedPage}
      />
    );
  }

  if (role !== 'admin') {
    return (
      <StandardNotificationsPage
        data={data}
        loading={loading}
        filter={standardFilter}
        sort={standardSort}
        search={standardSearch}
        markAllPending={markAllPending}
        onFilterChange={setStandardFilter}
        onSortChange={setStandardSort}
        onSearchChange={setStandardSearch}
        onMarkAllRead={handleMarkAllRead}
        onToggleRead={handleToggleRead}
        role={role}
      />
    );
  }

  return (
    <AdminNotificationsPage
      data={data}
      loading={loading}
      filter={adminFilter}
      sort={adminSort}
      search={adminSearch}
      actingNotificationId={actingNotificationId}
      markAllPending={markAllPending}
      onFilterChange={setAdminFilter}
      onSortChange={setAdminSort}
      onSearchChange={setAdminSearch}
      onMarkAllRead={handleMarkAllRead}
      onToggleRead={handleToggleRead}
      onCopySummary={handleCopySummary}
      onOpenRelatedPage={handleOpenRelatedPage}
    />
  );
}
