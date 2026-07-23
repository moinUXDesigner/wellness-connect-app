import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Role } from '../../types';
import { registerRequest } from './apiAuth';
import { getPostAuthRedirectPath } from './roleRedirects';
import { notifyError } from '../shared/lib/toast';

const signupRoles: Array<{ label: string; value: Role }> = [
  { label: 'Client', value: 'client' },
  { label: 'Counsellor', value: 'counsellor' },
  { label: 'Trainer', value: 'trainer' },
  { label: 'Coach', value: 'coach' },
  { label: 'Help Desk', value: 'helpdesk' },
  { label: 'Finance', value: 'finance' },
  { label: 'Legal', value: 'legal' },
  { label: 'Content', value: 'content' },
];

const goals = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'both', label: 'Both' },
] as const;

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [goal, setGoal] = useState<(typeof goals)[number]['value']>('fitness');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
      <p className="mt-1 text-sm text-slate-600">Register with the Laravel API to continue.</p>
      <form
        className="mt-6 grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);

          try {
            const user = await registerRequest({
              name,
              email,
              password,
              role,
              phone: phone || undefined,
              primary_goal: role === 'client' ? goal : undefined,
              consent_to_terms: consent,
            });
            navigate(getPostAuthRedirectPath(user));
          } catch (error) {
            notifyError(error, 'Unable to create account.');
          } finally {
            setLoading(false);
          }
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Optional phone number"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {signupRoles.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {role === 'client' ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Primary Goal</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              value={goal}
              onChange={(event) => setGoal(event.target.value as (typeof goals)[number]['value'])}
            >
              {goals.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          I agree to the platform terms and privacy policy.
        </label>
        <button
          className="rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading || !consent}
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-white" />
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">Already have an account? <Link className="text-indigo-600" to="/login">Sign in</Link></p>
    </div>
  );
}
