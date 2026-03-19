'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { draftkitApi } from 'lib/draftkitApi';
import PublicShell from 'components/PublicShell';

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
    <PublicShell>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 items-center justify-center py-10 lg:py-14">
        <section className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/14 bg-[linear-gradient(135deg,rgba(10,18,30,0.22),rgba(10,16,28,0.12)_58%,rgba(109,223,255,0.06))] px-6 py-7 shadow-[0_18px_46px_rgba(4,8,18,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-lg sm:px-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(134,236,255,0.08),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

          <div className="relative space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/68">Login</p>
              <h1 className="text-3xl font-medium tracking-[-0.04em] text-white">Return to your board.</h1>
              <p className="text-sm leading-7 text-white/72">
                Access your DraftElite workspace and continue your league prep with your saved draft context.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-3" noValidate>
              <label className="block text-sm font-medium text-white/86" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none backdrop-blur-sm placeholder:text-white/45 focus:border-[#63dfbc]"
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
              <label className="block text-sm font-medium text-white/86" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none backdrop-blur-sm placeholder:text-white/45 focus:border-[#63dfbc]"
                placeholder="Your password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
              <p className="min-h-5 text-sm text-[#fda4af]" role="status" aria-live="polite">
                {error}
              </p>
              <button
                className="inline-flex w-full items-center justify-center rounded-full bg-[#54d7b0] px-5 py-3 text-sm font-semibold text-[#07111d] shadow-[0_12px_30px_rgba(84,215,176,0.28)] transition hover:-translate-y-0.5 hover:bg-[#68e4bf] disabled:translate-y-0 disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="text-sm text-white/72">
              New user?{' '}
              <Link href="/register" className="text-[#7ce8ce] underline underline-offset-4">
                Register
              </Link>
            </p>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
