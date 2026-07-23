import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Apple,
  Brain,
  CalendarDays,
  CirclePause,
  CreditCard,
  Download,
  Dumbbell,
  FileText,
  Flower2,
  Headphones,
  MapPin,
  Plus,
  ReceiptText,
  Settings,
  TrendingUp,
  UserRound,
  Video,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { getClientMemberships, type ClientMembership } from '../../shared/services/membershipApi';
import { notifyError } from '../../shared/lib/toast';

type Tone = 'violet' | 'blue' | 'green' | 'orange';

const toneStyles: Record<Tone, { bg: string; text: string; soft: string; bar: string }> = {
  violet: { bg: 'bg-violet-600', text: 'text-violet-600', soft: 'bg-violet-50', bar: 'bg-violet-600' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', soft: 'bg-blue-50', bar: 'bg-blue-500' },
  green: { bg: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50', bar: 'bg-emerald-500' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-500', soft: 'bg-orange-50', bar: 'bg-orange-500' },
};

const membershipActions = [
  { label: 'Upgrade Plan', helper: 'View higher plans', Icon: TrendingUp },
  { label: 'Pause Membership', helper: 'Take a short break', Icon: CirclePause },
  { label: 'Billing Method', helper: 'Update payment details', Icon: CreditCard },
  { label: 'Receipts', helper: 'See all invoices', Icon: ReceiptText },
  { label: 'Buy Extra Session', helper: 'Add more sessions', Icon: Plus },
  { label: 'Support', helper: "We're here to help", Icon: Headphones },
];

const upcomingSessions = [
  { title: 'Personal Training', with: 'With Alex Morgan', date: 'May 20, 2026', time: '7:00 AM - 8:00 AM', mode: 'FitLife Studio', detail: 'In-person', status: 'Confirmed', Icon: Dumbbell, tone: 'blue' as Tone },
  { title: 'Psychology Session', with: 'With Dr. Aisha Rahman', date: 'May 22, 2026', time: '10:00 AM - 11:00 AM', mode: 'Online', detail: 'Video Call', status: 'Confirmed', Icon: Brain, tone: 'green' as Tone },
  { title: 'Nutrition Follow-up', with: 'With Sarah Khan', date: 'May 25, 2026', time: '3:00 PM - 3:30 PM', mode: 'Online', detail: 'Video Call', status: 'Pending', Icon: Apple, tone: 'orange' as Tone },
];

const fallbackTransactions = [
  { title: 'Complete Wellness - May 2026', detail: 'Monthly membership fee', date: 'May 12, 2026', amount: '$149.00' },
  { title: 'Extra Psychology Session', detail: 'One-time session', date: 'Apr 21, 2026', amount: '$95.00' },
  { title: 'Complete Wellness - Apr 2026', detail: 'Monthly membership fee', date: 'Apr 12, 2026', amount: '$149.00' },
];

const extraSessions = [
  { title: 'Extra Psychology Session', detail: 'One-on-one session', price: '$95', Icon: Brain, tone: 'green' as Tone },
  { title: 'Extra PT Session', detail: 'One-on-one training', price: '$85', Icon: Dumbbell, tone: 'blue' as Tone },
  { title: 'Nutrition Consultation', detail: 'One-on-one consultation', price: '$75', Icon: Apple, tone: 'orange' as Tone },
];

const membershipPlans = [
  {
    title: 'Mind Care',
    subtitle: 'Psychology & Counselling',
    price: '$79',
    credits: '4 Sessions / month',
    features: ['Individual therapy & counselling', 'Stress, anxiety & mood support', 'Confidential & evidence-based care'],
    Icon: Brain,
    tone: 'green' as Tone,
  },
  {
    title: 'Fitness Plus',
    subtitle: 'Personal Training & Coaching',
    price: '$99',
    credits: '4 Sessions / month',
    features: ['1-on-1 personal training', 'Fitness assessments & programs', 'Progress tracking & support'],
    Icon: Dumbbell,
    tone: 'blue' as Tone,
  },
  {
    title: 'Complete Wellness',
    subtitle: 'Mind, Body & Nutrition',
    price: '$149',
    credits: '8 Sessions / month',
    features: ['Psychology sessions', 'Personal training sessions', 'Nutrition consultations', 'Holistic support for better you'],
    Icon: Flower2,
    tone: 'violet' as Tone,
    recommended: true,
  },
];

const membershipBenefits = [
  { title: 'Session Credits', detail: 'Get monthly session credits based on your plan.', Icon: CalendarDays },
  { title: 'Priority Booking', detail: 'Book appointments faster with priority access.', Icon: CalendarDays },
  { title: 'Savings', detail: 'Enjoy reduced rates compared to pay-as-you-go.', Icon: TrendingUp },
  { title: 'Receipts & Billing', detail: 'Access all receipts and billing history anytime.', Icon: ReceiptText },
];

function usdFromMinor(amountMinor?: number | null) {
  if (!amountMinor) return '$149';
  return `$${Math.max(1, Math.round(amountMinor / 100))}`;
}

function formatDate(value?: string | null, fallback = 'Jun 12, 2026') {
  if (!value) return fallback;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function ClientMembershipPage() {
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientMemberships()
      .then(setMemberships)
      .catch((error) => notifyError(error, 'Unable to load memberships.'))
      .finally(() => setLoading(false));
  }, []);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.status === 'active') ?? null,
    [memberships],
  );

  const planName = activeMembership?.planName || 'Complete Wellness';
  const tierLabel = activeMembership?.tierLabel || 'Mind, Body & Nutrition';
  const price = usdFromMinor(activeMembership?.receipt?.amount_minor);
  const renewsOn = formatDate(activeMembership?.endsAt);
  const memberSince = activeMembership?.startsAt ? new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(activeMembership.startsAt)) : 'Jan 2026';
  const totalSessions = 8;
  const usedSessions = 5;
  const remainingSessions = Math.max(0, totalSessions - usedSessions);
  const creditData = [
    {
      label: 'Psychology Sessions',
      remaining: activeMembership?.credits.counselling ?? 3,
      total: Math.max(activeMembership?.credits.counselling ?? 3, 3),
      Icon: Brain,
      tone: 'green' as Tone,
    },
    {
      label: 'Personal Training Sessions',
      remaining: activeMembership?.credits.training ?? 2,
      total: Math.max(activeMembership?.credits.training ?? 2, 3),
      Icon: Dumbbell,
      tone: 'blue' as Tone,
    },
    { label: 'Nutrition Consultations', remaining: 1, total: 2, Icon: Apple, tone: 'orange' as Tone },
  ];
  const transactions = activeMembership?.receipt
    ? [
      {
        title: `${planName} - May 2026`,
        detail: activeMembership.receipt.receipt_number,
        date: formatDate(activeMembership.receipt.issued_at, 'May 12, 2026'),
        amount: `${price}.00`.replace('.00.00', '.00'),
        receiptId: activeMembership.receipt.id,
      },
      ...fallbackTransactions.slice(1),
    ]
    : fallbackTransactions;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-6 lg:space-y-6">
      <header>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">My Membership</h1>
        <p className="mt-1 text-base leading-6 text-slate-500">View your active plan, benefits, session credits, billing, and upgrade options.</p>
      </header>


      {loading ? (
        <MembershipSkeleton />
      ) : !activeMembership ? (
        <NoActiveMembershipView onBook={() => navigate('/client/intake')} />
      ) : (
        <>
          <ActiveMembershipCard
            planName={planName}
            tierLabel={tierLabel}
            price={price}
            renewsOn={renewsOn}
            memberSince={memberSince}
            usedSessions={usedSessions}
            totalSessions={totalSessions}
            remainingSessions={remainingSessions}
            onBook={() => navigate('/client/intake')}
          />

          <ActionStrip />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
            <BenefitsCard />
            <SessionCreditsCard credits={creditData} />
            <UpcomingSessionsCard onViewCalendar={() => navigate('/client/appointments')} />
            <TransactionsCard transactions={transactions} />
          </section>

          <ExtraSessionsCard />
        </>
      )}
    </div>
  );
}

function MembershipSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading membership details">
      <Card className="animate-pulse p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_220px_minmax(280px,0.9fr)] xl:items-center">
          <div className="flex gap-5">
            <div className="h-24 w-24 shrink-0 rounded-full bg-slate-100 sm:h-28 sm:w-28" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-64 max-w-full rounded bg-slate-100" />
              <div className="h-4 w-44 rounded bg-slate-100" />
              <div className="h-8 w-32 rounded bg-slate-100" />
              <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
            </div>
          </div>
          <div className="grid gap-4 border-y border-slate-200 py-5 sm:grid-cols-2 xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
            <div className="h-14 rounded-lg bg-slate-100" />
            <div className="h-14 rounded-lg bg-slate-100" />
          </div>
          <div className="grid gap-5 sm:grid-cols-[132px_1fr] sm:items-center">
            <div className="mx-auto h-32 w-32 rounded-full bg-slate-100" />
            <div className="space-y-3">
              <div className="h-5 w-48 rounded bg-slate-100" />
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-4 w-40 rounded bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
          <div className="h-11 rounded-lg bg-slate-100" />
          <div className="h-11 rounded-lg bg-slate-100" />
          <div className="h-11 rounded-lg bg-slate-100" />
        </div>
      </Card>

      <Card className="animate-pulse p-0">
        <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 p-4">
              <div className="h-11 w-11 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100" />
              <div className="h-5 w-48 rounded bg-slate-100" />
            </div>
            <div className="mt-5 space-y-4">
              <div className="h-5 rounded bg-slate-100" />
              <div className="h-5 rounded bg-slate-100" />
              <div className="h-5 w-3/4 rounded bg-slate-100" />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

function NoActiveMembershipView({ onBook }: { onBook: () => void }) {
  return (
    <>
      <Card className="p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1px_minmax(320px,0.7fr)] lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-violet-100 bg-white text-violet-600">
              <ReceiptText size={52} />
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-violet-600">No Active Membership</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                You don't have an active membership right now.
              </p>
              <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
                Choose a membership plan below to enjoy great benefits, or continue with pay-as-you-go appointments.
              </p>
            </div>
          </div>
          <div className="hidden h-full bg-slate-200 lg:block" />
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600">
              <WalletCards size={28} />
            </span>
            <div>
              <p className="font-semibold text-slate-950">Prefer flexibility?</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">You can book individual sessions anytime with pay-as-you-go options.</p>
              <button type="button" onClick={onBook} className="mt-4 rounded-lg border border-violet-400 px-5 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                Explore Pay As You Go
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <SectionHeading icon={Flower2} title="Available Membership Plans" />
        <section className="mt-4 grid gap-5 xl:grid-cols-3">
          {membershipPlans.map((plan) => <PlanCard key={plan.title} plan={plan} />)}
        </section>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <SectionHeading icon={WalletCards} title="Pay As You Go" />
          <button type="button" className="hidden text-sm font-semibold text-violet-600 sm:inline-flex">View all services</button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Book individual sessions without a membership.</p>
        <section className="mt-4 grid gap-4 xl:grid-cols-3">
          {extraSessions.map((service) => <PayAsYouGoCard key={service.title} service={service} onBook={onBook} />)}
        </section>
      </div>

      <NoPlanBenefitsCard />
    </>
  );
}

function PlanCard({ plan }: { plan: (typeof membershipPlans)[number] }) {
  const Icon = plan.Icon;
  const styles = toneStyles[plan.tone];
  return (
    <Card className={`relative overflow-hidden p-5 ${plan.recommended ? 'border-violet-500 bg-violet-50/30' : ''}`}>
      {plan.recommended ? (
        <span className="absolute right-0 top-0 rounded-bl-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white">Recommended</span>
      ) : null}
      <div className="flex items-start gap-4">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${styles.soft} ${styles.text}`}>
          <Icon size={34} />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{plan.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{plan.subtitle}</p>
          <p className={`mt-3 text-3xl font-semibold ${styles.text}`}>{plan.price}<span className="text-sm font-medium text-slate-500"> /month</span></p>
          <span className={`mt-3 inline-flex rounded-full px-4 py-1 text-sm font-semibold ${styles.soft} ${styles.text}`}>{plan.credits}</span>
        </div>
      </div>
      <div className="my-5 border-t border-slate-200" />
      <ul className="space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
            <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] text-white ${styles.bg}`}>✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <button type="button" className={`mt-6 min-h-11 w-full rounded-lg text-sm font-semibold transition ${plan.recommended ? 'bg-violet-600 text-white hover:bg-violet-700' : 'border border-violet-400 text-violet-700 hover:bg-violet-50'}`}>
        Choose Plan
      </button>
    </Card>
  );
}

function PayAsYouGoCard({ service, onBook }: { service: (typeof extraSessions)[number]; onBook: () => void }) {
  const Icon = service.Icon;
  const styles = toneStyles[service.tone];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${styles.soft} ${styles.text}`}>
          <Icon size={32} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-950">{service.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{service.detail}</p>
        </div>
        <p className="text-right text-xl font-semibold text-slate-950">{service.price}<span className="block text-sm font-medium text-slate-500">/session</span></p>
      </div>
      <button type="button" onClick={onBook} className="mt-4 min-h-10 w-full rounded-lg border border-violet-400 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
        Book Now
      </button>
    </Card>
  );
}

function NoPlanBenefitsCard() {
  return (
    <Card>
      <div className="grid gap-5 xl:grid-cols-[220px_1fr]">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Membership Benefits</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Memberships are designed to support your wellness journey with more value.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {membershipBenefits.map((benefit) => {
            const Icon = benefit.Icon;
            return (
              <div key={benefit.title} className="flex gap-3 border-slate-200 xl:border-l xl:pl-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{benefit.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{benefit.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
        You can access all your receipts and billing history anytime from your <span className="font-semibold text-violet-600">Activity</span> section, even without an active membership.
      </p>
    </Card>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.34)] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function ActiveMembershipCard({
  planName,
  tierLabel,
  price,
  renewsOn,
  memberSince,
  usedSessions,
  totalSessions,
  remainingSessions,
  onBook,
}: {
  planName: string;
  tierLabel: string;
  price: string;
  renewsOn: string;
  memberSince: string;
  usedSessions: number;
  totalSessions: number;
  remainingSessions: number;
  onBook: () => void;
}) {
  const progressPercent = (usedSessions / totalSessions) * 100;

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_220px_minmax(280px,0.9fr)] xl:items-center">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600 sm:h-28 sm:w-28">
            <Flower2 size={58} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold leading-tight text-violet-600 sm:text-3xl">{planName}</h2>
              <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">Active</span>
            </div>
            <p className="mt-2 text-base text-slate-500">{tierLabel}</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{price} <span className="text-lg font-medium text-slate-500">/ month</span></p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><Brain size={17} className="text-violet-600" />Psychology</span>
              <span className="inline-flex items-center gap-2"><Dumbbell size={17} className="text-violet-600" />Personal Training</span>
              <span className="inline-flex items-center gap-2"><Apple size={17} className="text-violet-600" />Nutrition</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-y border-slate-200 py-5 sm:grid-cols-2 xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
          <MetaItem icon={CalendarDays} label="Renews on" value={renewsOn} />
          <MetaItem icon={UserRound} label="Member since" value={memberSince} />
        </div>

        <div className="grid gap-5 sm:grid-cols-[132px_1fr] sm:items-center">
          <div className="relative mx-auto h-32 w-32 rounded-full" style={{ background: `conic-gradient(#6d28d9 ${progressPercent * 3.6}deg, #e5e7eb 0deg)` }}>
            <div className="absolute inset-3 grid place-items-center rounded-full bg-white text-center">
              <p className="text-3xl font-semibold text-slate-950">{usedSessions}/{totalSessions}</p>
              <p className="text-sm text-slate-500">Sessions</p>
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">{remainingSessions} sessions remaining</p>
            <div className="mt-3 h-2.5 rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-violet-600" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate-500">Resets on {renewsOn}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
        <button type="button" onClick={onBook} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(109,40,217,0.9)] transition hover:bg-violet-700">
          <CalendarDays size={18} />
          Book Session
        </button>
        <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-violet-300 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
          <Settings size={18} />
          Manage Plan
        </button>
        <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-violet-300 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
          <Download size={18} />
          Invoice
        </button>
      </div>
    </Card>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-violet-50 text-violet-600">
        <Icon size={21} />
      </span>
      <span>
        <span className="block text-sm text-slate-500">{label}</span>
        <span className="mt-1 block text-base font-semibold text-slate-950">{value}</span>
      </span>
    </div>
  );
}

function ActionStrip() {
  return (
    <Card className="p-0">
      <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6">
        {membershipActions.map((action) => {
          const Icon = action.Icon;
          return (
            <button key={action.label} type="button" className="flex items-center gap-3 p-4 text-left transition hover:bg-violet-50/70">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600">
                <Icon size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-950">{action.label}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{action.helper}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function SectionHeading({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-50 text-violet-600">
          <Icon size={21} />
        </span>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function BenefitsCard() {
  const benefits = [
    ['3 Psychology Sessions', 'One-on-one sessions with licensed psychologist'],
    ['3 Personal Training Sessions', 'One-on-one training with certified trainer'],
    ['2 Nutrition Consultations', 'One-on-one consultations with a nutrition expert'],
    ['Priority Booking', 'Book appointments faster'],
    ['Discount on extra sessions', 'Enjoy reduced rates on additional sessions'],
  ];

  return (
    <Card>
      <SectionHeading icon={Flower2} title="Your Membership Benefits" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {benefits.map(([title, detail]) => (
          <div key={title} className="flex gap-3">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white text-[11px]">✓</span>
            <div>
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SessionCreditsCard({ credits }: { credits: Array<{ label: string; remaining: number; total: number; Icon: LucideIcon; tone: Tone }> }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SectionHeading icon={Dumbbell} title="Session Credits" />
        <p className="text-sm text-slate-500">Your remaining credits this billing cycle</p>
      </div>
      <div className="mt-5 space-y-4">
        {credits.map((credit) => {
          const Icon = credit.Icon;
          const pct = (credit.remaining / credit.total) * 100;
          return (
            <div key={credit.label} className="grid grid-cols-[minmax(160px,1fr)_minmax(160px,1.5fr)_64px] items-center gap-4 max-sm:grid-cols-1">
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full ${toneStyles[credit.tone].soft} ${toneStyles[credit.tone].text}`}>
                  <Icon size={22} />
                </span>
                <p className="text-sm font-semibold text-slate-950">{credit.label}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">{credit.remaining} of {credit.total} remaining</p>
                <div className="h-2.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="rounded-lg bg-violet-50 px-3 py-2 text-center text-sm font-semibold text-violet-700">{credit.remaining} / {credit.total}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function UpcomingSessionsCard({ onViewCalendar }: { onViewCalendar: () => void }) {
  return (
    <Card>
      <SectionHeading
        icon={CalendarDays}
        title="Upcoming Sessions"
        action={<button type="button" onClick={onViewCalendar} className="text-sm font-semibold text-violet-600">View all</button>}
      />
      <div className="mt-4 divide-y divide-slate-100">
        {upcomingSessions.map((session) => {
          const Icon = session.Icon;
          return (
            <article key={session.title} className="grid grid-cols-[minmax(180px,1fr)_minmax(150px,0.9fr)_minmax(120px,0.8fr)_auto] items-center gap-3 py-3 max-md:grid-cols-1">
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-full ${toneStyles[session.tone].soft} ${toneStyles[session.tone].text}`}>
                  <Icon size={23} />
                </span>
                <div>
                  <p className="font-semibold text-slate-950">{session.title}</p>
                  <p className="text-sm text-slate-500">{session.with}</p>
                </div>
              </div>
              <p className="flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={17} />{session.date}<br className="hidden md:block" /> {session.time}</p>
              <p className="flex items-center gap-2 text-sm text-slate-600">{session.detail === 'Video Call' ? <Video size={17} /> : <MapPin size={17} />}{session.mode}<br className="hidden md:block" /> {session.detail}</p>
              <span className={`w-fit rounded-lg px-3 py-1.5 text-sm font-semibold ${session.status === 'Pending' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-700'}`}>{session.status}</span>
            </article>
          );
        })}
      </div>
    </Card>
  );
}

function TransactionsCard({ transactions }: { transactions: Array<{ title: string; detail: string; date: string; amount: string; receiptId?: number }> }) {
  return (
    <Card>
      <SectionHeading icon={FileText} title="Recent Transactions" action={<span className="text-sm font-semibold text-violet-600">View all receipts</span>} />
      <div className="mt-4 divide-y divide-slate-100">
        {transactions.map((transaction) => (
          <article key={`${transaction.title}-${transaction.date}`} className="grid grid-cols-[minmax(180px,1fr)_120px_100px_80px_24px] items-center gap-3 py-3 max-md:grid-cols-1">
            <div>
              <p className="font-semibold text-slate-950">{transaction.title}</p>
              <p className="text-sm text-slate-500">{transaction.detail}</p>
            </div>
            <p className="text-sm text-slate-600">{transaction.date}</p>
            <p className="font-semibold text-slate-950">{transaction.amount}</p>
            <span className="w-fit rounded-lg bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">Paid</span>
            {transaction.receiptId ? (
              <Link to={`/client/receipts/${transaction.receiptId}`} className="text-violet-600" aria-label="View receipt"><Download size={18} /></Link>
            ) : (
              <Download size={18} className="text-violet-600" />
            )}
          </article>
        ))}
      </div>
    </Card>
  );
}

function ExtraSessionsCard() {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {extraSessions.map((item) => {
        const Icon = item.Icon;
        return (
          <Card key={item.title} className="p-4">
            <div className="flex items-start gap-3">
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${toneStyles[item.tone].soft} ${toneStyles[item.tone].text}`}>
                <Icon size={29} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-5 text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                <p className="mt-4 text-lg font-semibold text-slate-950">{item.price} <span className="text-sm font-medium text-slate-500">/ session</span></p>
              </div>
            </div>
            <button type="button" className="mt-4 min-h-10 w-full rounded-lg border border-violet-400 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">Book Extra</button>
          </Card>
        );
      })}
    </section>
  );
}
