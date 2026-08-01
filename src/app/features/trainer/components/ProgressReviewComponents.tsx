import { type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Download,
  Dumbbell,
  Expand,
  FileText,
  HeartPulse,
  ImageIcon,
  Info,
  MoreVertical,
  NotebookPen,
  Scale,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '../../../components/ui/drawer';
import type { BodyMetricTrend, MessageThreadItem, ProgressKpi, RecommendationCard } from '../mockProgressReviewData';
import type { ProgressReviewWorkspaceData } from '../useProgressReviewData';
import { UserAvatar } from '../../../components/UserAvatar';

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-slate-200/80 bg-white shadow-[0_2px_14px_rgba(30,41,59,0.045)] ${className}`}>{children}</section>;
}

function trendTone(value: number): string {
  return value >= 0 ? 'text-emerald-600' : 'text-rose-500';
}

function TrendLabel({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const sign = value > 0 ? '+' : '';
  return <span className={trendTone(value)}>{`${sign}${value}${suffix} vs last 30 days`}</span>;
}

function KpiIcon({ icon }: { icon: ProgressKpi['icon'] }) {
  if (icon === 'scale') return <Scale size={18} />;
  if (icon === 'dumbbell') return <Dumbbell size={18} />;
  if (icon === 'calendar') return <CalendarDays size={18} />;
  return <Target size={18} />;
}

function BodyMetricIcon({ icon }: { icon: BodyMetricTrend['icon'] }) {
  if (icon === 'scale') return <Scale size={16} />;
  if (icon === 'percent') return <Target size={16} />;
  if (icon === 'arm') return <Dumbbell size={16} />;
  return <Info size={16} />;
}

function QuickActionIcon({ icon }: { icon: 'calendar' | 'file' | 'image' | 'note' }) {
  if (icon === 'calendar') return <CalendarDays size={18} />;
  if (icon === 'file') return <FileText size={18} />;
  if (icon === 'image') return <ImageIcon size={18} />;
  return <NotebookPen size={18} />;
}

function RecommendationIcon({ icon }: { icon: RecommendationCard['icon'] }) {
  if (icon === 'heart') return <HeartPulse size={20} />;
  return <Star size={20} />;
}

function IconButton({ children, label, badge }: { children: ReactNode; label: string; badge?: number }) {
  return (
    <button type="button" aria-label={label} className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-[#111941] transition hover:bg-indigo-50">
      {children}
      {badge ? <span className="absolute right-0 top-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{Math.min(badge, 99)}</span> : null}
    </button>
  );
}

function ProgressTrendSection({ payload }: { payload: ProgressReviewWorkspaceData }) {
  const performanceTooltip = ({ active, payload: chartPayload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) => {
    if (!active || !chartPayload?.length) return null;
    return (
      <div className="rounded-2xl border border-indigo-100 bg-[#6246ea] px-3 py-2 text-sm text-white shadow-lg">
        <p>{label}</p>
        <p className="font-semibold">{chartPayload[0]?.value}</p>
      </div>
    );
  };

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_2px_14px_rgba(30,41,59,0.045)] sm:p-5 lg:rounded-[26px] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <h3 className="text-[1.9rem] font-semibold tracking-tight text-[#111941] lg:text-lg">Progress Trend</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-2 text-[#6246ea]"><span className="h-[2px] w-5 bg-[#6246ea]" /> Performance Score</span>
            <span className="inline-flex items-center gap-2 text-indigo-400"><span className="h-[2px] w-5 border-t border-dashed border-indigo-400" /> Trend</span>
          </div>
        </div>
        <button type="button" className="inline-flex h-12 items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white px-4 text-sm font-medium text-[#111941] shadow-sm lg:min-w-[220px]">
          Performance Score
          <ChevronDown size={16} className="text-slate-500" />
        </button>
      </div>
      <div className="mt-4 h-[280px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={payload.progressTrend} margin={{ top: 10, right: 20, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
            <Tooltip content={performanceTooltip} />
            <Line type="monotone" dataKey="score" stroke="#6246ea" strokeWidth={3} dot={{ r: 5, fill: '#6246ea' }} activeDot={{ r: 7, fill: '#6246ea' }} />
            <Line type="monotone" dataKey="trend" stroke="#8b7cf7" strokeDasharray="4 4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function MessageThreadHeader({ payload }: { payload: ProgressReviewWorkspaceData }) {
  return (
    <div className="flex items-start gap-3">
      <UserAvatar user={payload.client} size="lg" className="h-14 w-14" decorative />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-semibold text-[#111941]">{payload.client.name}</h3>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{payload.client.status}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {payload.client.age ?? '--'} yrs
          <span className="mx-2">&bull;</span>
          {payload.client.gender ?? 'Client'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"><ChevronDown size={18} /></button>
        <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"><MoreVertical size={18} /></button>
      </div>
    </div>
  );
}

function MessageThreadBody({
  payload,
  filteredMessages,
}: {
  payload: ProgressReviewWorkspaceData;
  filteredMessages: MessageThreadItem[];
}) {
  return (
    <>
      <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        Today
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
        {filteredMessages.map((message) => {
          const isClient = message.senderRole === 'client';
          return (
            <div key={message.id} className={`flex gap-3 ${isClient ? 'justify-end' : 'justify-start'}`}>
              {!isClient ? <UserAvatar user={payload.trainer} src={payload.trainer.avatarUrl} size="lg" className="mt-6 h-11 w-11" decorative /> : null}
              <div className={`max-w-[88%] sm:max-w-[78%] ${isClient ? 'items-end' : 'items-start'} flex flex-col`}>
                <p className="mb-2 text-sm font-medium text-slate-500">
                  {message.senderName}
                  <span className="mx-1">&bull;</span>
                  {message.timestampLabel}
                </p>
                <div className={`rounded-[22px] px-5 py-4 text-[15px] leading-7 shadow-sm ${
                  isClient ? 'border border-slate-200 bg-white text-[#111941]' : 'bg-[linear-gradient(135deg,#efe9ff_0%,#f7f4ff_100%)] text-[#111941]'
                }`}>
                  <p>{message.body}</p>
                  {message.attachment ? (
                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><FileText size={22} /></span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-[#111941]">{message.attachment.name}</strong>
                        <span className="text-sm text-slate-500">{message.attachment.type} | {message.attachment.sizeLabel}</span>
                      </span>
                      <button type="button" className="rounded-xl p-2 text-indigo-600 transition hover:bg-indigo-50" aria-label="Download attachment">
                        <Download size={18} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              {isClient ? <UserAvatar user={payload.client} size="lg" className="mt-6 h-11 w-11" decorative /> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

function MessageComposer({
  payload,
  draftMessage,
  isSending,
  onDraftChange,
  onSubmit,
}: {
  payload: ProgressReviewWorkspaceData;
  draftMessage: string;
  isSending: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 rounded-[24px] border border-indigo-200 bg-white px-4 py-3 shadow-sm">
        <input
          type="text"
          value={draftMessage}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Type a message..."
          className="w-full border-none bg-transparent text-sm text-[#111941] outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isSending || !draftMessage.trim()}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {payload.quickActions.map((action) => (
          <button key={action.id} type="button" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-[#111941] transition hover:border-indigo-100 hover:bg-indigo-50">
            <QuickActionIcon icon={action.icon} />
            {action.label}
          </button>
        ))}
      </div>
    </form>
  );
}

export function ProgressReviewTopbar({
  title,
  dateLabel,
  searchValue,
  notificationCount,
  onSearchChange,
}: {
  title: string;
  dateLabel: string;
  searchValue: string;
  notificationCount: number;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header className="px-5 pt-5 sm:px-7 lg:px-0 lg:pt-0">
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(360px,1fr)_minmax(720px,800px)] xl:items-center xl:gap-8">
        <div className="space-y-3">
          <h1 className="max-w-[11ch] text-[2.15rem] font-semibold leading-[1.06] tracking-tight text-[#101842] sm:max-w-[14ch] sm:text-[2.4rem] xl:max-w-none xl:text-[2.15rem] xl:leading-tight">
            {title}
          </h1>
        </div>
        <div className="space-y-3 xl:justify-self-end xl:w-full xl:max-w-[760px]">
          <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_auto] xl:items-center">
            <button type="button" className="inline-flex h-14 items-center justify-between gap-3 rounded-[22px] border border-indigo-100 bg-white px-4 text-sm font-medium text-[#111941] shadow-sm">
              <span className="inline-flex items-center gap-3">
                <CalendarDays size={18} className="text-indigo-600" />
                {dateLabel}
              </span>
              <ChevronDown size={16} className="text-slate-500" />
            </button>
            <label className="flex h-14 items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-4 shadow-sm">
              <Search size={18} className="text-slate-400" />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search..."
                className="w-full border-none bg-transparent text-sm text-[#111941] outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="flex items-center justify-between gap-2 sm:justify-end xl:justify-end">
              <IconButton label="Notifications" badge={notificationCount}><Bell size={20} /></IconButton>
              <IconButton label="Messages"><FileText size={20} /></IconButton>
              <div className="mx-1 hidden h-7 border-l border-slate-200 xl:block" />
              <IconButton label="Fullscreen"><Expand size={19} /></IconButton>
              <IconButton label="More actions"><MoreVertical size={19} /></IconButton>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function ClientWorkspaceSummary({
  payload,
  messageTo,
}: {
  payload: ProgressReviewWorkspaceData;
  messageTo: string;
}) {
  return (
    <Card className="p-5 xl:hidden">
      <div className="space-y-3 text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-lg font-semibold text-[#111941]">{payload.client.name}</span>
          <span>{payload.client.email}</span>
        </div>
        {payload.activePlan ? <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{payload.activePlan.goalTitle}</span> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/trainer/plans" className="inline-flex items-center justify-center rounded-2xl border border-indigo-100 bg-white px-4 py-2 font-semibold text-indigo-600 transition hover:bg-indigo-50">
            View Updated Plan
          </Link>
          <Link to="/trainer/check-ins" className="inline-flex items-center justify-center rounded-2xl border border-indigo-100 bg-white px-4 py-2 font-semibold text-indigo-600 transition hover:bg-indigo-50">
            Open Check-ins
          </Link>
          <Link to={messageTo} className="inline-flex items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-100 sm:col-span-2">
            Open Message Thread
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function ProgressOverviewCard({
  payload,
}: {
  payload: ProgressReviewWorkspaceData;
}) {
  return (
    <Card className="p-4 sm:p-5 lg:p-6">
      <h2 className="text-[2rem] font-semibold tracking-tight text-[#111941] lg:text-xl">Progress Overview</h2>
      <div className="mt-5 grid gap-4 2xl:grid-cols-[260px_minmax(0,1fr)] 2xl:items-start">
        <div className="rounded-[30px] bg-[radial-gradient(circle_at_top,#f5f1ff_0%,#ffffff_68%)] p-5">
          <div
            className="mx-auto flex h-[212px] w-[212px] items-center justify-center rounded-full p-[16px]"
            style={{
              background: `conic-gradient(#6246ea ${payload.overview.overallProgressPercent}%, #ede9fe ${payload.overview.overallProgressPercent}% 100%)`,
            }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white shadow-inner">
              <span className="text-5xl font-semibold tracking-tight text-[#111941]">{payload.overview.overallProgressPercent}%</span>
              <span className="mt-2 text-sm font-medium text-slate-500">Overall Progress</span>
              <span className="mt-3 text-sm font-medium">
                <TrendLabel value={payload.overview.overallTrendPercent} />
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {payload.kpis.map((kpi) => (
            <article key={kpi.id} className="min-w-0 rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-600">
                <span className="min-w-0 truncate">{kpi.title}</span>
                {kpi.usesInfoDot ? <Info size={15} className="shrink-0 text-slate-300" /> : null}
              </div>
              <span className="mt-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <KpiIcon icon={kpi.icon} />
              </span>
              <p className="mt-5 text-[2rem] font-semibold leading-none tracking-tight text-[#111941] xl:text-[1.85rem] 2xl:text-[2rem]">{kpi.value}</p>
              <p className={`mt-3 text-sm font-medium ${kpi.tone === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>{kpi.supportingText}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-5">
        <ProgressTrendSection payload={payload} />
      </div>
    </Card>
  );
}

export function BodyMetricsTrendCard({ metrics }: { metrics: BodyMetricTrend[] }) {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-[#111941]">Body Metrics Trend</h3>
      <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-100 xl:block">
        <div className="grid grid-cols-[minmax(160px,1fr)_88px_88px_100px] bg-slate-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Metric</span>
          <span>May 12</span>
          <span>Jun 12</span>
          <span>Change</span>
        </div>
        {metrics.map((metric) => (
          <div key={metric.id} className="grid grid-cols-[minmax(160px,1fr)_88px_88px_100px] items-center border-t border-slate-100 px-4 py-3 text-sm text-[#111941]">
            <span className="inline-flex items-center gap-3 font-medium">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><BodyMetricIcon icon={metric.icon} /></span>
              {metric.label}
            </span>
            <span>{metric.startValue}</span>
            <span>{metric.currentValue}</span>
            <span className={metric.tone === 'success' ? 'font-medium text-emerald-600' : 'text-slate-500'}>{metric.change}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-3 xl:hidden">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><BodyMetricIcon icon={metric.icon} /></span>
              <div className="min-w-0">
                <p className="font-semibold text-[#111941]">{metric.label}</p>
                <p className="text-sm text-slate-500">{metric.startValue} to {metric.currentValue}</p>
              </div>
            </div>
            <p className={`mt-3 text-sm font-medium ${metric.tone === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>{metric.change}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CompletedWorkoutsCard({ points }: { points: ProgressReviewWorkspaceData['completedWorkouts'] }) {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-[#111941]">Completed Workouts (Last 4 Weeks)</h3>
      <div className="mt-4 h-[260px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 10, right: 6, bottom: 24, left: -10 }}>
            <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval={0} angle={0} dy={12} minTickGap={12} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 16, borderColor: '#ddd6fe', boxShadow: '0 12px 32px rgba(79,70,229,0.12)' }} />
            <Bar dataKey="count" fill="#6246ea" radius={[12, 12, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function MuscleGroupFocusCard({ items }: { items: ProgressReviewWorkspaceData['muscleFocus'] }) {
  const totalSets = items.reduce((sum, item) => sum + item.sets, 0);

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-[#111941]">Muscle Group Focus</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={items} dataKey="sets" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={2}>
                {items.map((item) => <Cell key={item.id} fill={item.color} />)}
              </Pie>
              <text x="50%" y="44%" textAnchor="middle" className="fill-slate-500 text-[13px] font-medium">Total</text>
              <text x="50%" y="56%" textAnchor="middle" className="fill-[#111941] text-[30px] font-semibold">{totalSets}</text>
              <text x="50%" y="68%" textAnchor="middle" className="fill-slate-500 text-[13px] font-medium">Sets</text>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 px-4 py-3">
              <span className="inline-flex items-center gap-3 font-medium text-[#111941]">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="text-right text-sm">
                <strong className="block text-[#111941]">{item.percent}%</strong>
                <span className="text-slate-500">({item.sets} sets)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function RecommendationCards({ items }: { items: ProgressReviewWorkspaceData['recommendations'] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <Card key={item.id} className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <RecommendationIcon icon={item.icon} />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-[#111941]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              <Link to={item.to} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50">
                {item.ctaLabel}
                <Sparkles size={15} />
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function MessageThreadCard({
  payload,
  searchValue,
  draftMessage,
  isSending,
  onDraftChange,
  onSubmit,
  className = '',
}: {
  payload: ProgressReviewWorkspaceData;
  searchValue: string;
  draftMessage: string;
  isSending: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
}) {
  const filteredMessages = payload.messages.filter((message) => {
    if (!searchValue.trim()) return true;
    const query = searchValue.toLowerCase();
    return message.body.toLowerCase().includes(query) || message.senderName.toLowerCase().includes(query);
  });

  return (
    <Card className={`flex min-h-[820px] flex-col overflow-hidden p-5 ${className}`.trim()}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 className="text-xl font-semibold text-[#111941]">Message Thread</h2>
      </div>
      <div className="pt-4">
        <MessageThreadHeader payload={payload} />
      </div>
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <MessageThreadBody payload={payload} filteredMessages={filteredMessages} />
      </div>
      <div className="border-t border-slate-100 pt-4">
        <MessageComposer
          payload={payload}
          draftMessage={draftMessage}
          isSending={isSending}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
        />
      </div>
    </Card>
  );
}

export function MobileMessageThreadDrawer({
  open,
  onOpenChange,
  payload,
  searchValue,
  draftMessage,
  isSending,
  onDraftChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: ProgressReviewWorkspaceData;
  searchValue: string;
  draftMessage: string;
  isSending: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const filteredMessages = payload.messages.filter((message) => {
    if (!searchValue.trim()) return true;
    const query = searchValue.toLowerCase();
    return message.body.toLowerCase().includes(query) || message.senderName.toLowerCase().includes(query);
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[92dvh] rounded-t-[32px] border-slate-200 bg-white px-0 lg:hidden">
        <DrawerHeader className="border-b border-slate-100 px-5 pb-4 pt-3 text-left">
          <DrawerTitle className="text-xl font-semibold text-[#111941]">Message Thread</DrawerTitle>
          <DrawerDescription className="text-sm text-slate-500">Review follow-ups and send updates without leaving the progress workspace.</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
          <div className="py-4">
            <MessageThreadHeader payload={payload} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <MessageThreadBody payload={payload} filteredMessages={filteredMessages} />
          </div>
          <div className="mt-4 border-t border-slate-100 bg-white pt-4">
            <MessageComposer
              payload={payload}
              draftMessage={draftMessage}
              isSending={isSending}
              onDraftChange={onDraftChange}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function ProgressReviewSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-5 pt-5 sm:px-7 lg:px-0 lg:pt-0">
      <div className="h-20 animate-pulse rounded-[28px] bg-slate-100" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="h-[560px] animate-pulse rounded-[28px] bg-slate-100" />
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            <div className="h-[320px] animate-pulse rounded-[28px] bg-slate-100" />
            <div className="h-[320px] animate-pulse rounded-[28px] bg-slate-100" />
            <div className="h-[320px] animate-pulse rounded-[28px] bg-slate-100" />
          </div>
          <div className="grid gap-4 2xl:grid-cols-2">
            <div className="h-[220px] animate-pulse rounded-[28px] bg-slate-100" />
            <div className="h-[220px] animate-pulse rounded-[28px] bg-slate-100" />
          </div>
        </div>
        <div className="h-[820px] animate-pulse rounded-[28px] bg-slate-100" />
      </div>
    </div>
  );
}

export function EmptyProgressReviewState() {
  return (
    <Card className="mx-5 mt-5 p-8 text-center sm:mx-7 lg:mx-auto lg:mt-0 lg:max-w-[1380px]">
      <h2 className="text-xl font-semibold text-[#111941]">No trainer client is connected yet.</h2>
      <p className="mt-3 text-sm text-slate-500">Book a training client or create an active plan first to open the progress review workspace.</p>
    </Card>
  );
}
