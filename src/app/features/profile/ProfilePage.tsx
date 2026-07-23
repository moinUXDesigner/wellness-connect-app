import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import type { Role } from '../../types';
import { changePasswordRequest, getAccountProfileRequest, updateAccountAvatarRequest, updateAccountProfileRequest, type AccountProfileRoleDetails } from '../auth/apiAuth';
import { getAuthState, type AuthUser } from '../auth/auth';
import { ProfileAvatarUploader } from '../../components/ProfileAvatarUploader';
import { notifyError, notifySuccess, toast } from '../shared/lib/toast';

const goals = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'both', label: 'Both' },
] as const;

const roleDescriptions: Record<Role, string> = {
  admin: 'Manage your admin account details and security settings.',
  client: 'Update your personal details, wellness preferences, and account security.',
  counsellor: 'Manage your counsellor account details and workspace identity.',
  trainer: 'Review your trainer account settings and professional summary.',
  coach: 'Manage your coach account details and security settings.',
  helpdesk: 'Manage your help desk account details and security settings.',
  finance: 'Manage your finance console account details and security settings.',
  legal: 'Manage your legal console account details and security settings.',
  content: 'Manage your content workspace account details and security settings.',
};

function displayDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfilePage({ role }: { role: Role }) {
  const authUser = getAuthState().user;
  const [user, setUser] = useState<AuthUser | null>(authUser);
  const [roleDetails, setRoleDetails] = useState<AccountProfileRoleDetails | null>(null);
  const [name, setName] = useState(authUser?.name ?? '');
  const [phone, setPhone] = useState(authUser?.phone ?? '');
  const [primaryGoal, setPrimaryGoal] = useState<(typeof goals)[number]['value']>((authUser?.primary_goal as (typeof goals)[number]['value']) ?? 'fitness');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [consent, setConsent] = useState(Boolean(authUser?.consent_to_terms));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let mounted = true;

    void getAccountProfileRequest()
      .then((data) => {
        if (!mounted) return;
        setUser(data.user);
        setRoleDetails(data.roleDetails);
        setName(data.user.name);
        setPhone(data.user.phone ?? '');
        setConsent(Boolean(data.user.consent_to_terms));
        const clientDetails = data.roleDetails.client;
        setPrimaryGoal((clientDetails?.primaryGoal as (typeof goals)[number]['value']) ?? 'fitness');
        setTimezone(clientDetails?.timezone ?? 'Asia/Kolkata');
        setPreferredLanguage(clientDetails?.preferredLanguage ?? 'en');
      })
      .catch((error) => {
        if (!mounted) return;
        notifyError(error, 'Unable to load latest profile right now.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const trainerDetails = roleDetails?.trainer;
  const pageUser = user ?? authUser;
  const roleLabel = roleDetails?.roleLabel ?? 'Account';
  const workspaceTitle = roleDetails?.workspaceTitle ?? 'Workspace';
  const avatarSrc = pageUser?.avatarUrl ?? trainerDetails?.profilePhotoUrl;

  async function handleAvatarUpload(file: Blob) {
    const data = await updateAccountAvatarRequest(file);
    setUser(data.user);
    setRoleDetails(data.roleDetails);
    notifySuccess(data.message);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <ProfileAvatarUploader user={pageUser} src={avatarSrc} onUpload={handleAvatarUpload} disabled={loading} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">{workspaceTitle}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{pageUser?.name ?? 'Profile'}</h1>
            <p className="mt-2 text-sm text-slate-600">{roleDescriptions[role]}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{roleLabel}</p>
          <p className="mt-1">Account status: <span className="capitalize">{pageUser?.status ?? 'active'}</span></p>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-950">Account settings</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Keep your contact details and consent preferences up to date.</p>

            <form
              className="mt-6 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setSaving(true);
                try {
                  const data = await updateAccountProfileRequest({
                    name,
                    phone,
                    consent_to_terms: consent,
                    ...(role === 'client'
                      ? {
                          primary_goal: primaryGoal,
                          timezone,
                          preferred_language: preferredLanguage,
                        }
                      : {}),
                  });
                  setUser(data.user);
                  setRoleDetails(data.roleDetails);
                  notifySuccess(data.message);
                } catch (error) {
                  notifyError(error, 'Profile update failed.');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Name
                  <input className="rounded-2xl border border-slate-300 px-4 py-3" value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Phone
                  <input className="rounded-2xl border border-slate-300 px-4 py-3" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Email
                  <input className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500" value={pageUser?.email ?? ''} disabled />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Role
                  <input className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500" value={roleLabel} disabled />
                </label>
                {role === 'client' ? (
                  <>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Wellness goal
                      <select className="rounded-2xl border border-slate-300 px-4 py-3" value={primaryGoal} onChange={(event) => setPrimaryGoal(event.target.value as (typeof goals)[number]['value'])}>
                        {goals.map((goal) => (
                          <option key={goal.value} value={goal.value}>{goal.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Timezone
                      <input className="rounded-2xl border border-slate-300 px-4 py-3" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                      Preferred language
                      <input className="rounded-2xl border border-slate-300 px-4 py-3" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)} />
                    </label>
                  </>
                ) : null}
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" className="mt-1" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>I confirm consent for data processing under platform terms.</span>
              </label>

              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
              >
                {saving ? 'Saving profile...' : 'Save profile'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Change password</h2>
            <p className="mt-2 text-sm text-slate-600">Update your password to keep your account secure.</p>
            <form
              className="mt-6 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (newPassword !== confirmPassword) {
                  toast.error('New password and confirm password do not match.');
                  return;
                }
                setPasswordSaving(true);
                try {
                  const message = await changePasswordRequest({
                    current_password: currentPassword,
                    password: newPassword,
                    password_confirmation: confirmPassword,
                  });
                  notifySuccess(message);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                } catch (error) {
                  notifyError(error, 'Password update failed.');
                } finally {
                  setPasswordSaving(false);
                }
              }}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Current password
                  <input className="rounded-2xl border border-slate-300 px-4 py-3" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  New password
                  <input className="rounded-2xl border border-slate-300 px-4 py-3" type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Confirm password
                  <input className="rounded-2xl border border-slate-300 px-4 py-3" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                </label>
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
              >
                {passwordSaving ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          {role === 'trainer' ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">Professional summary</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">Trainer application</h2>
              <p className="mt-2 text-sm text-slate-600">Professional profile details stay in the trainer onboarding workflow so your review data stays consistent.</p>
              <dl className="mt-6 space-y-4 text-sm text-slate-700">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Application status</dt>
                  <dd className="mt-1 capitalize">{trainerDetails?.applicationStatus?.replaceAll('_', ' ') ?? 'Not started'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Application ID</dt>
                  <dd className="mt-1">{trainerDetails?.applicationId ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted on</dt>
                  <dd className="mt-1">{displayDate(trainerDetails?.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Specialties</dt>
                  <dd className="mt-1">{trainerDetails?.specialties?.length ? trainerDetails.specialties.join(', ') : 'Not added yet'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt>
                  <dd className="mt-1">{trainerDetails?.location || 'Not added yet'}</dd>
                </div>
              </dl>
              <Link
                to={trainerDetails?.editUrl ?? '/trainer/onboarding?mode=edit'}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Edit professional profile
              </Link>
            </section>
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">Workspace summary</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">{workspaceTitle}</h2>
              <p className="mt-2 text-sm text-slate-600">This page covers your shared account settings for the {roleLabel.toLowerCase()} workspace.</p>
              <dl className="mt-6 space-y-4 text-sm text-slate-700">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</dt>
                  <dd className="mt-1">{roleLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace</dt>
                  <dd className="mt-1">{workspaceTitle}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account status</dt>
                  <dd className="mt-1 capitalize">{pageUser?.status ?? 'active'}</dd>
                </div>
              </dl>
            </section>
          )}
        </aside>
      </section>
    </div>
  );
}
