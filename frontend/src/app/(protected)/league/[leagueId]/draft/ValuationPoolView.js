export default function ValuationPoolView({
  leagueId,
  lookupQuery,
  setLookupQuery,
  isLoadingDraft,
  draftError,
  lookupRows,
  PlayerCell,
}) {
  return (
    <div className="panel overflow-x-auto">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Valuation Pool</h2>
          <p className="text-sm text-slate-600">Filter the current valuation pool without the draft-board framing.</p>
        </div>
        <label className="flex w-full max-w-sm flex-col gap-1 text-sm">
          <span className="font-medium text-white">Filter valuation pool</span>
          <input
            className="input"
            value={lookupQuery}
            onChange={(event) => setLookupQuery(event.target.value)}
            placeholder="Player name, team, position, MLB ID"
          />
        </label>
      </div>
      {isLoadingDraft ? (
        <p className="text-sm text-slate-600">Loading valuation pool...</p>
      ) : draftError ? (
        <p className="text-sm text-red-600">{draftError}</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-2 py-2 font-medium">Player</th>
              <th className="px-2 py-2 font-medium">Team</th>
              <th className="px-2 py-2 font-medium">Pos</th>
              <th className="px-2 py-2 font-medium">Adjusted</th>
            </tr>
          </thead>
          <tbody>
            {lookupRows.map((row) => (
              <tr key={`lookup-${row.id}`} className="border-b border-slate-200/70">
                <td className="px-2 py-2 font-medium">
                  <PlayerCell row={row} href={`/league/${leagueId}/players/${row.id}`} />
                </td>
                <td className="px-2 py-2">{row.team}</td>
                <td className="px-2 py-2">{row.position}</td>
                <td className="px-2 py-2 font-semibold text-white">${row.adjustedValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
