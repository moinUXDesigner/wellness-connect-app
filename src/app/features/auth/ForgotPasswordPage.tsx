import { useState } from 'react';
import { Link } from 'react-router';
import { forgotPasswordRequest } from './apiAuth';
import { notifyError, notifySuccess } from '../shared/lib/toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
      <p className="mt-1 text-sm text-slate-600">Enter your account email to receive a reset link.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          try {
            const message = await forgotPasswordRequest(email);
            notifySuccess(message);
          } catch (error) {
            notifyError(error, 'Unable to send password reset link.');
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
            placeholder="you@example.com"
            required
          />
        </div>
        <button
          className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Remembered your password? <Link className="text-indigo-600" to="/login">Sign in</Link>
      </p>
    </div>
  );
}
