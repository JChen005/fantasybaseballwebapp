"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { draftkitApi } from "lib/draftkitApi";
import PublicShell from "components/PublicShell";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) {
      setError("Missing password reset token.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await draftkitApi.resetPassword({
        token,
        password: form.password,
      });
      setSuccess(true);
      setForm({ password: "", confirmPassword: "" });
    } catch (err) {
      setError(err.message || "Could not reset password.");
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
                New Password
              </p>
              <h1 className="text-3xl font-medium tracking-[-0.04em] text-white">
                Choose a new password.
              </h1>
              <p className="text-sm leading-7 text-white/72">
                Password reset links expire after 30 minutes.
              </p>
            </div>

            {!token ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">
                This reset link is missing a token. Request a new password reset link.
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-3" noValidate>
              <label className="block text-sm font-medium text-white/86" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none backdrop-blur-sm placeholder:text-white/45 focus:border-[#63dfbc]"
                placeholder="At least 8 characters"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                required
              />

              <label className="block text-sm font-medium text-white/86" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none backdrop-blur-sm placeholder:text-white/45 focus:border-[#63dfbc]"
                placeholder="Repeat password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    confirmPassword: event.target.value,
                  }))
                }
                required
              />

              <p className="min-h-5 text-sm text-[#fda4af]" role="status" aria-live="polite">
                {error}
              </p>

              {success ? (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
                  Password updated. You can now log in with your new password.
                </div>
              ) : null}

              <button
                className="inline-flex w-full items-center justify-center rounded-full bg-[#54d7b0] px-5 py-3 text-sm font-semibold text-[#07111d] shadow-[0_12px_30px_rgba(84,215,176,0.28)] transition hover:-translate-y-0.5 hover:bg-[#68e4bf] disabled:translate-y-0 disabled:opacity-60"
                disabled={loading || !token}
                type="submit"
              >
                {loading ? "Resetting password..." : "Reset password"}
              </button>
            </form>

            <p className="text-sm text-white/72">
              Back to{" "}
              <Link href="/login" className="text-[#7ce8ce] underline underline-offset-4">
                login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}