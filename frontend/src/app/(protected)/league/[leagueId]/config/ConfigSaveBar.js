import Link from 'next/link';

export default function ConfigSaveBar({
  error,
  form,
  leagueId,
  loading,
  saving,
  status,
  totalRosterSlots,
}) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-3 shadow-[0_18px_50px_rgba(3,8,24,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-400">
        {form.config.teamCount} teams · ${form.config.budget} each · {totalRosterSlots} roster slots
      </p>

      <div className="md:ml-auto">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="min-w-[11rem] text-sm md:text-right">
            {status ? <span className="text-emerald-100">{status}</span> : null}
            {error ? <span className="text-red-100">{error}</span> : null}
          </div>

          <Link
            href={`/league/${leagueId}/keeper`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-white/[0.08]"
          >
            Go to keeper page
          </Link>

          <button
            className="btn rounded-2xl px-5 py-3 transition duration-300 active:scale-[0.98]"
            type="submit"
            disabled={loading || saving}
          >
            {saving ? 'Saving...' : 'Save league settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
