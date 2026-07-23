import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { resetPasswordRequest } from './apiAuth';
import { notifyError, notifySuccess } from '../shared/lib/toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const presetEmail = params.get('email') ?? '';
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => Boolean(token && email && password && confirmPassword), [token, email, password, confirmPassword]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
      <p className="mt-1 text-sm text-slate-600">Set a new password for your account.</p>

      {!token ? <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Invalid or missing reset token.</p> : null}

      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          try {
            const message = await resetPasswordRequest({
              email,
              token,
              password,
              password_confirmation: confirmPassword,
            });
            notifySuccess(message);
            setTimeout(() => navigate('/login'), 1200);
          } catch (error) {
            notifyError(error, 'Unable to reset password.');
          } finally {
            setLoading(false);
          }
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            type="password"
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>
        <button
          className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading || !canSubmit}
        >
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Back to <Link className="text-indigo-600" to="/login">Sign in</Link>
      </p>
    </div>
  );
}
