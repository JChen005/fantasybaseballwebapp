export default function CreateLeagueForm({
  createLeague,
  creatingLeague,
  error,
  name,
  season,
  setName,
  setSeason,
}) {
  return (
    <div className="panel">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Create
          </p>
          <h2 className="text-lg font-semibold text-white">Start a new league</h2>
        </div>

        <form className="flex flex-wrap items-end gap-3" onSubmit={createLeague}>
          <div className="w-full max-w-xs">
            <label
              htmlFor="leagueName"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              League Name
            </label>
            <input
              id="leagueName"
              className="w-full rounded-full border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/30"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div className="w-32">
            <label
              htmlFor="leagueSeason"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              Season
            </label>
            <input
              id="leagueSeason"
              className="w-full rounded-full border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/30"
              type="number"
              min="1901"
              max="2100"
              value={season}
              onChange={(event) => setSeason(Number(event.target.value) || 2026)}
              required
            />
          </div>
          <button
            className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06] disabled:opacity-60"
            type="submit"
            disabled={creatingLeague}
          >
            {creatingLeague ? 'Creating...' : 'Create League'}
          </button>
        </form>

        <p className="min-h-5 text-sm text-red-600" role="status" aria-live="polite">
          {error}
        </p>
      </div>
    </div>
  );
}
