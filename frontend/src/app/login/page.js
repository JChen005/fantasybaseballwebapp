'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { draftkitApi } from 'lib/draftkitApi';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await draftkitApi.login(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell flex min-h-screen items-center py-10">
      <section className="panel mx-auto w-full max-w-md space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Login</h1>
          <p className="text-sm text-slate-600">Access your DraftKit workspace and continue your league prep.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            placeholder="Your password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
          />
          <p className="min-h-5 text-sm text-red-600" role="status" aria-live="polite">
            {error}
          </p>
          <button className="btn w-full" disabled={loading} type="submit">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-sm text-slate-700">
          New user?{' '}
          <Link href="/register" className="text-[#7ce8ce] underline underline-offset-4">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
