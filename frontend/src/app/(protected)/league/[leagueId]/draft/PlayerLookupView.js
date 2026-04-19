export default function PlayerLookupView({
  league,
  leagueId,
  playerSearchQuery,
  setPlayerSearchQuery,
  isSearchingPlayers,
  normalizedPlayerSearchQuery,
  isLoadingPlayerSearch,
  playerSearchError,
  playerSearchRows,
  PlayerCell,
  SearchIcon,
}) {
  return (
    <div className="panel">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Player Lookup</h2>
          <p className="text-sm text-slate-600">
            Search MLB players during the draft without the valuation-pool table competing for space.
          </p>
        </div>
        <label className="relative w-full lg:max-w-md">
          <span className="mb-1 block text-sm font-medium text-white">Search all players</span>
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-[2.35rem] left-3 h-4 w-4 text-slate-500"
          />
          <input
            className="input pl-10"
            type="search"
            value={playerSearchQuery}
            onChange={(event) => setPlayerSearchQuery(event.target.value)}
            placeholder="Start typing a player name"
          />
        </label>
      </div>

      {isSearchingPlayers ? (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-white">Player Search Results</h3>
            <p className="text-sm text-slate-600">
              {league?.config?.leagueType
                ? `Showing ${league.config.leagueType} player matches for "${normalizedPlayerSearchQuery}".`
                : `Showing player matches for "${normalizedPlayerSearchQuery}".`}
            </p>
          </div>

          {isLoadingPlayerSearch ? (
            <p className="text-sm text-slate-600">Searching players...</p>
          ) : playerSearchError ? (
            <p className="text-sm text-red-600">{playerSearchError}</p>
          ) : !playerSearchRows.length ? (
            <p className="text-sm text-slate-600">No players matched that search. Try a different name.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-2 py-2 font-medium">Player</th>
                  <th className="px-2 py-2 font-medium">Pos</th>
                  <th className="px-2 py-2 font-medium">AVG (Last Year)</th>
                  <th className="px-2 py-2 font-medium">AVG (3YR)</th>
                </tr>
              </thead>
              <tbody>
                {playerSearchRows.map((row) => (
                  <tr key={`search-${row.id}`} className="border-b border-slate-200/70">
                    <td className="px-2 py-2 font-medium">
                      <PlayerCell row={row} href={`/league/${leagueId}/players/${row.id}`} />
                    </td>
                    <td className="px-2 py-2">{row.position}</td>
                    <td className="px-2 py-2">{row.avgLastYear}</td>
                    <td className="px-2 py-2">{row.avg3yr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600">Use the search box to look up players across the wider player pool.</p>
      )}
    </div>
  );
}
