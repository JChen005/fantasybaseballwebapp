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
      <h2 className="mb-2 text-lg font-semibold">Create League</h2>
      <form className="flex flex-wrap items-center gap-2" onSubmit={createLeague}>
        <div className="w-full max-w-xs">
          <label htmlFor="leagueName" className="sr-only">
            League name
          </label>
          <input
            id="leagueName"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div className="w-28">
          <label htmlFor="leagueSeason" className="sr-only">
            Draft year
          </label>
          <input
            id="leagueSeason"
            className="input"
            type="number"
            min="1901"
            max="2100"
            value={season}
            onChange={(event) => setSeason(Number(event.target.value) || 2026)}
            required
          />
        </div>
        <button className="btn" type="submit" disabled={creatingLeague}>
          {creatingLeague ? 'Creating...' : 'Create'}
        </button>
      </form>
      <p className="mt-2 min-h-5 text-sm text-red-600" role="status" aria-live="polite">
        {error}
      </p>
    </div>
  );
}
