'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { draftkitApi } from 'lib/draftkitApi';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', displayName: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await draftkitApi.register(form);
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
          <h1 className="text-2xl font-semibold">Register</h1>
          <p className="text-sm text-slate-600">Create your account to launch keeper, draft, and taxi workflows.</p>
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
          <label className="block text-sm font-medium text-slate-700" htmlFor="displayName">
            Display Name
          </label>
          <input
            id="displayName"
            className="input"
            placeholder="Your name"
            autoComplete="name"
            value={form.displayName}
            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
            required
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            placeholder="At least 8 characters"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            minLength={8}
            required
          />
          <p className="min-h-5 text-sm text-red-600" role="status" aria-live="polite">
            {error}
          </p>
          <button className="btn w-full" disabled={loading} type="submit">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="text-sm text-slate-700">
          Returning user?{' '}
          <Link href="/login" className="text-[#7ce8ce] underline underline-offset-4">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
