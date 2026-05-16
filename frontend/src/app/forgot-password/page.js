"use client";

import { useState } from "react";
import Link from "next/link";
import { draftkitApi } from "lib/draftkitApi";
import PublicShell from "components/PublicShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setResetUrl("");
    setLoading(true);

    try {
      const result = await draftkitApi.requestPasswordReset({ email });
      setMessage(result.message || "Password reset request created.");
      if (result.resetUrl) {
        setResetUrl(result.resetUrl);
      }
    } catch (err) {
      setError(err.message || "Could not create password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <div className="mx-auto flex w-full max-w-350 flex-1 items-center justify-center py-10 lg:py-14">
        <section className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/14 bg-[linear-gradient(135deg,rgba(10,18,30,0.22),rgba(10,16,28,0.12)_58%,rgba(109,223,255,0.06))] px-6 py-7 shadow-[0_18px_46px_rgba(4,8,18,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-lg sm:px-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(134,236,255,0.08),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

          <div className="relative space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/68">
                Password Reset
              </p>
              <h1 className="text-3xl font-medium tracking-[-0.04em] text-white">
                Reset your password.
              </h1>
              <p className="text-sm leading-7 text-white/72">
                Enter the email for your DraftElite account. In demo mode, the reset link will appear here.
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <p className="min-h-5 text-sm text-[#fda4af]" role="status" aria-live="polite">
                {error}
              </p>

              {message ? (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
                  {message}
                </div>
              ) : null}

              {resetUrl ? (
                <div className="space-y-2 rounded-2xl border border-white/12 bg-white/8 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                    Reset link
                  </p>
                  <Link
                    href={resetUrl}
                    className="break-all text-sm text-[#7ce8ce] underline underline-offset-4"
                  >
                    {resetUrl}
                  </Link>
                </div>
              ) : null}

              <button
                className="inline-flex w-full items-center justify-center rounded-full bg-[#54d7b0] px-5 py-3 text-sm font-semibold text-[#07111d] shadow-[0_12px_30px_rgba(84,215,176,0.28)] transition hover:-translate-y-0.5 hover:bg-[#68e4bf] disabled:translate-y-0 disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? "Creating reset link..." : "Create reset link"}
              </button>
            </form>

            <p className="text-sm text-white/72">
              Remembered it?{" "}
              <Link href="/login" className="text-[#7ce8ce] underline underline-offset-4">
                Login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}