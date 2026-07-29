import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Cog,
  FileClock,
  HeartPulse,
  OctagonAlert,
  ShieldAlert,
  Siren,
  UserRoundCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppNotification } from './notificationsApi';

export type AdminNotificationCategory = 'escalations' | 'approvals' | 'system' | 'general';
export type AdminNotificationSeverity = 'high' | 'medium' | 'low';
export type AdminNotificationFilter = 'all' | 'unread' | 'read' | 'escalations' | 'approvals' | 'system';
export type AdminNotificationSort = 'newest' | 'oldest';
export type AdminNotificationGroupKey = 'today' | 'yesterday' | 'earlier';

type AccentStyles = {
  dot: string;
  icon: string;
  card: string;
  action: string;
};

export type AdminNotificationViewModel = {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  title: string;
  label: string;
  category: AdminNotificationCategory;
  categoryLabel: string;
  severity: AdminNotificationSeverity;
  severityLabel: string;
  ctaLabel: string;
  entityName: string;
  entityMeta: string;
  relatedPath: string;
  icon: LucideIcon;
  accent: AccentStyles;
  timeLabel: string;
  dateLabel: string;
  searchText: string;
};

export type AdminNotificationOverview = {
  total: number;
  unread: number;
  escalations: number;
  approvals: number;
  system: number;
};

export type AdminNotificationGroup = {
  key: AdminNotificationGroupKey;
  title: string;
  items: AdminNotificationViewModel[];
};

function titleCaseWords(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function humanizeType(value: string): string {
  return titleCaseWords(value.replace(/[_-]+/g, ' '));
}

function normalizedText(notification: AppNotification): string {
  const meta = notification.meta ?? {};
  return [
    notification.type,
    notification.message,
    typeof meta.title === 'string' ? meta.title : '',
    typeof meta.summary === 'string' ? meta.summary : '',
    typeof meta.workflowKey === 'string' ? meta.workflowKey : '',
    typeof meta.serviceType === 'string' ? meta.serviceType : '',
    typeof meta.topic === 'string' ? meta.topic : '',
  ].join(' ').toLowerCase();
}

function hasApprovalSignal(notification: AppNotification): boolean {
  const text = normalizedText(notification);
  return /(approval|approve|approved|application|review|pending review|submitted)/.test(text);
}

function hasSystemSignal(notification: AppNotification): boolean {
  const text = normalizedText(notification);
  return /(system|service|workflow|config|configuration|no-show|no show|health|booking)/.test(text);
}

function notificationCategory(notification: AppNotification): AdminNotificationCategory {
  if (notification.type === 'escalation' || notification.type === 'workflow_sla_breach') return 'escalations';
  if (hasApprovalSignal(notification)) return 'approvals';
  if (hasSystemSignal(notification)) return 'system';
  return 'general';
}

function categoryLabel(category: AdminNotificationCategory): string {
  if (category === 'escalations') return 'Escalations';
  if (category === 'approvals') return 'Approvals';
  if (category === 'system') return 'System';
  return 'General updates';
}

function severityFromPriority(priority: unknown): AdminNotificationSeverity | null {
  if (typeof priority !== 'string') return null;
  const normalized = priority.toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  if (normalized === 'low') return 'low';
  return null;
}

function notificationSeverity(notification: AppNotification, category: AdminNotificationCategory): AdminNotificationSeverity {
  const prioritySeverity = severityFromPriority(notification.meta?.priority);
  if (prioritySeverity) return prioritySeverity;

  const text = normalizedText(notification);
  if (notification.type === 'escalation' || notification.type === 'workflow_sla_breach') return 'high';
  if (category === 'approvals') return 'medium';
  if (/(service warning|warning|degraded|attention)/.test(text)) return 'medium';
  return 'low';
}

function severityLabel(severity: AdminNotificationSeverity): string {
  if (severity === 'high') return 'High';
  if (severity === 'medium') return 'Medium';
  return 'Low';
}

function accentStyles(category: AdminNotificationCategory, severity: AdminNotificationSeverity): AccentStyles {
  if (severity === 'high' || category === 'escalations') {
    return {
      dot: 'bg-rose-500',
      icon: 'bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100',
      card: 'border-rose-100 bg-white shadow-[0_18px_45px_-30px_rgba(225,29,72,0.32)]',
      action: 'border-rose-200 text-rose-700 hover:bg-rose-50',
    };
  }

  if (severity === 'medium' || category === 'approvals') {
    return {
      dot: 'bg-amber-500',
      icon: 'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100',
      card: 'border-amber-100 bg-white shadow-[0_18px_45px_-30px_rgba(217,119,6,0.28)]',
      action: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    };
  }

  if (category === 'system') {
    return {
      dot: 'bg-sky-500',
      icon: 'bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100',
      card: 'border-sky-100 bg-white shadow-[0_18px_45px_-30px_rgba(14,165,233,0.25)]',
      action: 'border-sky-200 text-sky-700 hover:bg-sky-50',
    };
  }

  return {
    dot: 'bg-emerald-500',
    icon: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100',
    card: 'border-emerald-100 bg-white shadow-[0_18px_45px_-30px_rgba(5,150,105,0.22)]',
    action: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
  };
}

function notificationIcon(notification: AppNotification, category: AdminNotificationCategory): LucideIcon {
  if (notification.type === 'escalation') return Siren;
  if (notification.type === 'workflow_sla_breach') return ShieldAlert;
  if (notification.type === 'appointment_no_show') return FileClock;
  if (notification.type === 'trainer_pain_alert') return HeartPulse;
  if (hasApprovalSignal(notification)) return UserRoundCheck;
  if (notification.read) return CheckCircle2;
  if (category === 'system') return Cog;
  if (category === 'general') return ClipboardCheck;
  return Bell;
}

function workflowLabel(workflowKey: unknown): string {
  if (typeof workflowKey !== 'string' || !workflowKey.trim()) return 'Workflow';
  return humanizeType(workflowKey);
}

function appointmentMeta(startsAt: unknown): string {
  if (typeof startsAt !== 'string' || !startsAt) return 'Schedule timing unavailable';
  return new Date(startsAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function entityDetails(notification: AppNotification, category: AdminNotificationCategory): { entityName: string; entityMeta: string } {
  const meta = notification.meta ?? {};
  const title = typeof meta.title === 'string' ? meta.title : '';

  if (notification.type === 'escalation') {
    return {
      entityName: typeof meta.clientName === 'string' && meta.clientName ? meta.clientName : `Escalation #${meta.workflowCaseId ?? notification.id}`,
      entityMeta: workflowLabel(meta.workflowKey),
    };
  }

  if (notification.type === 'workflow_sla_breach') {
    return {
      entityName: `Workflow case #${meta.workflowCaseId ?? notification.id}`,
      entityMeta: workflowLabel(meta.workflowKey),
    };
  }

  if (notification.type === 'appointment_no_show') {
    return {
      entityName: `Appointment #${meta.appointmentId ?? notification.id}`,
      entityMeta: appointmentMeta(meta.startsAt),
    };
  }

  if (category === 'approvals') {
    return {
      entityName:
        (typeof meta.applicantName === 'string' && meta.applicantName)
        || (typeof meta.clientName === 'string' && meta.clientName)
        || (typeof meta.requesterName === 'string' && meta.requesterName)
        || 'Approval queue',
      entityMeta:
        (typeof meta.applicationId === 'string' && meta.applicationId)
        || (typeof meta.subject === 'string' && meta.subject)
        || 'Pending review',
    };
  }

  if (category === 'system') {
    return {
      entityName:
        (typeof meta.serviceName === 'string' && meta.serviceName)
        || (typeof meta.workflowKey === 'string' ? workflowLabel(meta.workflowKey) : '')
        || (title ? title : 'System notification'),
      entityMeta:
        (typeof meta.summary === 'string' && meta.summary)
        || (typeof meta.topic === 'string' && meta.topic)
        || 'Operational update',
    };
  }

  return {
    entityName:
      (typeof meta.clientName === 'string' && meta.clientName)
      || (typeof meta.requesterName === 'string' && meta.requesterName)
      || (title ? title : 'Workspace notification'),
    entityMeta:
      (typeof meta.summary === 'string' && meta.summary)
      || (typeof meta.topic === 'string' && meta.topic)
      || humanizeType(notification.type),
  };
}

function notificationLabel(notification: AppNotification, category: AdminNotificationCategory): string {
  if (notification.type === 'escalation') return 'Critical escalation';
  if (notification.type === 'workflow_sla_breach') return 'Workflow SLA breach';
  if (notification.type === 'appointment_no_show') return 'No-show alert';
  if (notification.type === 'trainer_pain_alert') return 'Safety alert';
  if (notification.type === 'trainer_low_adherence') return 'Adherence alert';
  if (notification.type === 'trainer_follow_up_due') return 'Follow-up due';
  if (notification.type === 'trainer_new_client') return 'New client';
  if (category === 'approvals') return 'Approval update';
  if (category === 'system') return 'System update';
  return humanizeType(notification.type);
}

function notificationTitle(notification: AppNotification, label: string): string {
  const title = notification.meta?.title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  return label;
}

function callToActionLabel(notification: AppNotification, category: AdminNotificationCategory): string {
  if (notification.type === 'escalation') return 'Resolve';
  if (notification.type === 'workflow_sla_breach') return 'Review';
  if (category === 'approvals') return 'Review';
  if (category === 'system') return 'View details';
  return 'Open';
}

function relatedPath(notification: AppNotification, category: AdminNotificationCategory): string {
  const text = normalizedText(notification);
  if (notification.type === 'escalation' || notification.type === 'workflow_sla_breach') return '/admin/escalations';
  if (category === 'approvals') {
    return text.includes('trainer') ? '/admin/trainer-applications' : '/admin/approvals';
  }
  if (category === 'system') {
    if (/(workflow|config|configuration)/.test(text)) return '/admin/workflows';
    return '/admin/health';
  }
  return '/admin/notifications';
}

function formattedDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeLabel(value: string | null): string {
  const date = formattedDate(value);
  if (!date) return 'Time unavailable';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function dateLabel(value: string | null): string {
  const date = formattedDate(value);
  if (!date) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function buildAdminNotificationViewModel(notification: AppNotification): AdminNotificationViewModel {
  const category = notificationCategory(notification);
  const severity = notificationSeverity(notification, category);
  const label = notificationLabel(notification, category);
  const title = notificationTitle(notification, label);
  const entity = entityDetails(notification, category);

  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    read: notification.read,
    createdAt: notification.createdAt,
    title,
    label,
    category,
    categoryLabel: categoryLabel(category),
    severity,
    severityLabel: severityLabel(severity),
    ctaLabel: callToActionLabel(notification, category),
    entityName: entity.entityName,
    entityMeta: entity.entityMeta,
    relatedPath: relatedPath(notification, category),
    icon: notificationIcon(notification, category),
    accent: accentStyles(category, severity),
    timeLabel: timeLabel(notification.createdAt),
    dateLabel: dateLabel(notification.createdAt),
    searchText: [
      notification.message,
      title,
      label,
      entity.entityName,
      entity.entityMeta,
      categoryLabel(category),
      humanizeType(notification.type),
    ].join(' ').toLowerCase(),
  };
}

export function buildAdminNotificationViewModels(items: AppNotification[]): AdminNotificationViewModel[] {
  return items.map(buildAdminNotificationViewModel);
}

export function groupAdminNotifications(
  items: AdminNotificationViewModel[],
  sort: AdminNotificationSort,
): AdminNotificationGroup[] {
  const sortedItems = [...items].sort((left, right) => {
    const leftTime = formattedDate(left.createdAt)?.getTime() ?? 0;
    const rightTime = formattedDate(right.createdAt)?.getTime() ?? 0;
    return sort === 'newest' ? rightTime - leftTime : leftTime - rightTime;
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  const groups: Record<AdminNotificationGroupKey, AdminNotificationViewModel[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  sortedItems.forEach((item) => {
    const itemDate = formattedDate(item.createdAt);
    if (!itemDate) {
      groups.earlier.push(item);
      return;
    }

    if (itemDate >= startOfToday) {
      groups.today.push(item);
      return;
    }

    if (itemDate >= startOfYesterday) {
      groups.yesterday.push(item);
      return;
    }

    groups.earlier.push(item);
  });

  const orderedGroups: AdminNotificationGroup[] = [
    { key: 'today', title: 'Today', items: groups.today },
    { key: 'yesterday', title: 'Yesterday', items: groups.yesterday },
    { key: 'earlier', title: 'Earlier', items: groups.earlier },
  ];
  return orderedGroups.filter((group) => group.items.length > 0);
}

export function calculateAdminNotificationOverview(items: AdminNotificationViewModel[]): AdminNotificationOverview {
  return {
    total: items.length,
    unread: items.filter((item) => !item.read).length,
    escalations: items.filter((item) => item.category === 'escalations').length,
    approvals: items.filter((item) => item.category === 'approvals' && !item.read).length,
    system: items.filter((item) => item.category === 'system').length,
  };
}

export function notificationMatchesFilter(
  item: AdminNotificationViewModel,
  filter: AdminNotificationFilter,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery && !item.searchText.includes(normalizedQuery)) return false;
  if (filter === 'unread') return !item.read;
  if (filter === 'read') return item.read;
  if (filter === 'escalations' || filter === 'approvals' || filter === 'system') {
    return item.category === filter;
  }
  return true;
}

export function overviewCardIcon(key: keyof AdminNotificationOverview): LucideIcon {
  if (key === 'total') return Activity;
  if (key === 'unread') return Bell;
  if (key === 'escalations') return OctagonAlert;
  if (key === 'approvals') return UserRoundCheck;
  return Cog;
}

export function overviewCardTone(key: keyof AdminNotificationOverview): string {
  if (key === 'total') return 'bg-violet-50 text-violet-600';
  if (key === 'unread') return 'bg-sky-50 text-sky-600';
  if (key === 'escalations') return 'bg-rose-50 text-rose-600';
  if (key === 'approvals') return 'bg-amber-50 text-amber-600';
  return 'bg-emerald-50 text-emerald-600';
}

export function severityBadgeStyles(severity: AdminNotificationSeverity): string {
  if (severity === 'high') return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  if (severity === 'medium') return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
}

export function tabIcon(filter: AdminNotificationFilter): LucideIcon {
  if (filter === 'all') return Bell;
  if (filter === 'unread') return AlertTriangle;
  if (filter === 'read') return CheckCircle2;
  if (filter === 'escalations') return ShieldAlert;
  if (filter === 'approvals') return UserRoundCheck;
  return Cog;
}
