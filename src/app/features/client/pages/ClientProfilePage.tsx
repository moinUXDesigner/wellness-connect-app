import { useEffect, useState, type ReactNode } from 'react';
import {
  Building2,
  Briefcase,
  Camera,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Globe2,
  Heart,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  Users,
  Bell,
} from 'lucide-react';
import { getAuthState } from '../../auth/auth';
import { meRequest, updateAccountAvatarRequest, updateProfileRequest } from '../../auth/apiAuth';
import { ProfileAvatarUploader } from '../../../components/ProfileAvatarUploader';
import type { UserAvatarUser } from '../../../components/UserAvatar';
import profileHeroBg from '../../../../assets/client-profile-hero-bg.svg';
import { notifyError, notifySuccess, toast } from '../../shared/lib/toast';

const goals = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'both', label: 'Mind and Body' },
] as const;

const languages = [
  { value: 'en', label: 'English (en)' },
  { value: 'hi', label: 'Hindi (hi)' },
  { value: 'te', label: 'Telugu (te)' },
] as const;

const genderOptions = [
  { value: '', label: 'Not recorded' },
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
  { value: 'self_describe', label: 'Self-describe' },
] as const;

function genderChoiceFor(value?: string | null) {
  if (!value) return '';
  return genderOptions.some((option) => option.value === value) ? value : 'self_describe';
}

export default function ClientProfilePage() {
  const authUser = getAuthState().user;
  const [profileUser, setProfileUser] = useState<UserAvatarUser | null>(authUser);
  const [name, setName] = useState(authUser?.name ?? '');
  const [phone, setPhone] = useState(authUser?.phone ?? '');
  const [primaryGoal, setPrimaryGoal] = useState<(typeof goals)[number]['value']>((authUser?.primary_goal as (typeof goals)[number]['value']) ?? 'mental_health');
  const [dob, setDob] = useState(authUser?.dob ?? '');
  const [genderChoice, setGenderChoice] = useState(genderChoiceFor(authUser?.gender));
  const [genderSelfDescription, setGenderSelfDescription] = useState(genderChoiceFor(authUser?.gender) === 'self_describe' ? authUser?.gender ?? '' : '');
  const [occupation, setOccupation] = useState(authUser?.occupation ?? '');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [preferredLanguage, setPreferredLanguage] = useState<(typeof languages)[number]['value']>('en');
  const [consent, setConsent] = useState(Boolean(authUser?.consent_to_terms));
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  const email = authUser?.email ?? '';
  const displayName = name.trim() || authUser?.name || 'Client';
  const avatarUser = { ...profileUser, name: displayName, email };
  const selectedGoalLabel = goals.find((goal) => goal.value === primaryGoal)?.label ?? 'Mental Health';
  const selectedLanguageLabel = languages.find((language) => language.value === preferredLanguage)?.label ?? 'English (en)';
  const selectedGenderLabel = genderOptions.find((option) => option.value === genderChoice)?.label ?? 'Not recorded';
  const maxDob = new Date().toISOString().slice(0, 10);

  function applyClientDemographics(user: { dob?: string | null; gender?: string | null; occupation?: string | null }) {
    const nextGenderChoice = genderChoiceFor(user.gender);
    setDob(user.dob ?? '');
    setGenderChoice(nextGenderChoice);
    setGenderSelfDescription(nextGenderChoice === 'self_describe' ? user.gender ?? '' : '');
    setOccupation(user.occupation ?? '');
  }

  useEffect(() => {
    meRequest().then((user) => {
      setName(user.name);
      setPhone(user.phone ?? '');
      setPrimaryGoal((user.primary_goal as (typeof goals)[number]['value']) ?? 'mental_health');
      setConsent(Boolean(user.consent_to_terms));
      applyClientDemographics(user);
      setProfileUser(user);
    }).catch(() => {
      toast.error('Unable to load latest profile right now.');
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const gender = genderChoice === 'self_describe' ? genderSelfDescription.trim() : genderChoice;
      const data = await updateProfileRequest({
        name,
        phone,
        primary_goal: primaryGoal,
        dob: dob || null,
        gender: gender || null,
        occupation: occupation.trim() || null,
        consent_to_terms: consent,
        timezone,
        preferred_language: preferredLanguage,
      });
      if (data.user) {
        setProfileUser(data.user);
        applyClientDemographics(data.user);
      }
      notifySuccess('Profile updated successfully.');
    } catch (error) {
      notifyError(error, 'Profile update failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(file: Blob) {
    const data = await updateAccountAvatarRequest(file);
    setProfileUser(data.user);
    setName(data.user.name);
    setPhone(data.user.phone ?? '');
    applyClientDemographics(data.user);
    notifySuccess(data.message);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[1500px] space-y-5 pb-6 lg:space-y-6">
      <section className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.34)] sm:p-7 lg:p-8">
        <img
          src={profileHeroBg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center lg:gap-8">
          <ProfileAvatarUploader
            user={avatarUser}
            src={avatarUser.avatarUrl ?? avatarUser.profilePhotoUrl}
            sizeClassName="h-36 w-36 border-2 border-violet-600 p-1 shadow-sm sm:h-40 sm:w-40"
            onUpload={handleAvatarUpload}
            disabled={loading}
          />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">{displayName}</h1>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge icon={<ShieldCheck size={16} />} label="Client" tone="violet" />
              <Badge icon={<Check size={16} />} label="Active" tone="green" />
            </div>
            <p className="mx-auto mt-4 max-w-lg text-base leading-6 text-slate-500 sm:mx-0">
              Manage your personal details, preferences, and account settings.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex min-h-12 w-full max-w-[260px] items-center justify-center gap-3 rounded-lg bg-violet-600 px-6 text-base font-semibold text-white shadow-[0_14px_30px_-18px_rgba(109,40,217,0.9)] transition hover:bg-violet-700 sm:w-auto"
            >
              <User size={19} />
              Edit Profile
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
        <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.34)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <SectionTitle icon={<User size={24} />} title="Personal Information" subtitle="Keep your contact details and preferences up to date." />
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-violet-600 lg:hidden" aria-label="Collapse personal information">
              <ChevronUp size={20} />
            </button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <TextField label="Full Name" icon={<User size={21} />} value={name} onChange={setName} required />
            <TextField label="Phone" icon={<Phone size={21} />} value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
            <ReadOnlyField label="Email" icon={<Mail size={21} />} value={email || 'basheer@wellnessconnect.local'} />
            <ReadOnlyField label="Role" icon={<ShieldCheck size={21} />} value="Client" muted />
            <TextField label="Date of Birth" icon={<CalendarDays size={21} />} value={dob} onChange={setDob} type="date" max={maxDob} />
            <SelectField
              label="Gender"
              icon={<User size={21} />}
              value={genderChoice}
              displayValue={selectedGenderLabel}
              onChange={setGenderChoice}
              options={genderOptions}
            />
            {genderChoice === 'self_describe' ? (
              <TextField label="Self-described Gender" icon={<User size={21} />} value={genderSelfDescription} onChange={setGenderSelfDescription} maxLength={30} placeholder="Enter gender" />
            ) : null}
            <TextField label="Occupation" icon={<Briefcase size={21} />} value={occupation} onChange={setOccupation} maxLength={120} placeholder="Your occupation" />
            <SelectField
              label="Wellness Goal"
              icon={<Heart size={21} />}
              value={primaryGoal}
              displayValue={selectedGoalLabel}
              onChange={(value) => setPrimaryGoal(value as (typeof goals)[number]['value'])}
              options={goals}
            />
            <SelectField
              label="Timezone"
              icon={<Globe2 size={21} />}
              value={timezone}
              displayValue={timezone}
              onChange={setTimezone}
              options={[{ value: 'Asia/Kolkata', label: 'Asia/Kolkata' }, { value: 'UTC', label: 'UTC' }]}
            />
            <div className="sm:col-span-2">
              <SelectField
                label="Preferred Language"
                icon={<Globe2 size={21} />}
                value={preferredLanguage}
                displayValue={selectedLanguageLabel}
                onChange={(value) => setPreferredLanguage(value as (typeof languages)[number]['value'])}
                options={languages}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <ProfilePhotoCard user={avatarUser} onUpload={handleAvatarUpload} disabled={loading} />
          <WorkspaceSummary />
          <PreferencesCard enabled={emailNotifications} onToggle={() => setEmailNotifications((value) => !value)} />
        </aside>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 text-base text-slate-600">
          <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-md bg-violet-600 text-white">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="absolute inset-0 cursor-pointer opacity-0" />
            {consent ? <Check size={19} /> : null}
          </span>
          I confirm consent for data processing under platform terms.
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-violet-600 px-6 text-base font-semibold text-white shadow-[0_16px_34px_-20px_rgba(109,40,217,0.9)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
        >
          <Save size={22} />
          {loading ? 'Saving Profile...' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex min-w-0 items-start gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600">{icon}</span>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold leading-6 text-slate-950">{title}</h2>
        <p className="mt-1 text-base leading-6 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Badge({ icon, label, tone }: { icon: ReactNode; label: string; tone: 'violet' | 'green' }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
      {icon}
      {label}
    </span>
  );
}

function FieldFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function TextField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  max,
  maxLength,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  max?: string;
  maxLength?: number;
}) {
  return (
    <FieldFrame label={label}>
      <span className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 shadow-sm">
        <span className="text-violet-600">{icon}</span>
        <input
          type={type}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          max={max}
          maxLength={maxLength}
        />
      </span>
    </FieldFrame>
  );
}

function ReadOnlyField({ label, icon, value, muted = false }: { label: string; icon: ReactNode; value: string; muted?: boolean }) {
  return (
    <FieldFrame label={label}>
      <span className={`flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 text-base shadow-sm ${muted ? 'bg-slate-50 text-slate-500' : 'bg-white text-slate-950'}`}>
        <span className="text-violet-600">{icon}</span>
        <span className="min-w-0 truncate">{value}</span>
      </span>
    </FieldFrame>
  );
}

function SelectField({
  label,
  icon,
  value,
  displayValue,
  onChange,
  options,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  displayValue: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <FieldFrame label={label}>
      <span className="relative flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 shadow-sm">
        <span className="text-violet-600">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-base">{displayValue}</span>
        <ChevronDown size={20} className="text-slate-600" />
        <select
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </span>
    </FieldFrame>
  );
}

function ProfilePhotoCard({ user, onUpload, disabled }: { user: UserAvatarUser; onUpload: (file: Blob) => Promise<void>; disabled: boolean }) {
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.34)]">
      <SectionTitle icon={<Camera size={24} />} title="Profile Photo" subtitle="Your photo helps personalize your experience." />
      <div className="mt-5 flex w-full items-center gap-4 rounded-lg border border-dashed border-violet-400 bg-white p-4 text-left">
        <ProfileAvatarUploader
          user={user}
          src={user.avatarUrl ?? user.profilePhotoUrl}
          sizeClassName="h-16 w-16"
          onUpload={onUpload}
          disabled={disabled}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-slate-950">Change photo</span>
          <span className="mt-1 block text-sm text-slate-500">JPG, PNG up to 5MB</span>
        </span>
      </div>
    </section>
  );
}

function WorkspaceSummary() {
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.34)]">
      <SectionTitle icon={<Building2 size={24} />} title="Workspace Summary" subtitle="This page covers your shared account settings for the client workspace." />
      <dl className="mt-5 space-y-4 text-base">
        <SummaryRow icon={<Users size={21} />} label="Role" value="Client" />
        <SummaryRow icon={<Building2 size={21} />} label="Workspace" value="Client Portal" />
        <SummaryRow icon={<ShieldCheck size={21} />} label="Account Status" value={<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"><Check size={16} />Active</span>} />
      </dl>
    </section>
  );
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-600">{icon}</span>
      <dt className="flex-1 font-medium text-slate-600">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function PreferencesCard({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.34)]">
      <SectionTitle icon={<Heart size={24} />} title="Preferences" subtitle="Choose how you'd like to receive updates." />
      <div className="mt-5 flex items-center gap-4">
        <Bell size={23} className="text-slate-600" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-slate-950">Email Notifications</p>
          <p className="mt-0.5 text-sm text-slate-500">Receive important updates via email</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-8 w-14 items-center rounded-full p-1 transition ${enabled ? 'justify-end bg-violet-600' : 'justify-start bg-slate-200'}`}
          aria-pressed={enabled}
          aria-label="Toggle email notifications"
        >
          <span className="h-6 w-6 rounded-full bg-white shadow-sm" />
        </button>
      </div>
    </section>
  );
}
