export default function DepthView({
  selectedTeamId,
  setSelectedTeamId,
  MLB_DEPTH_CHART_TEAMS,
  isLoadingDepth,
  depthError,
  depthChart,
  sortDepthSlots,
}) {
  return (
    <div className="panel space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Player Depth</h2>
          <p className="text-sm text-slate-600">MLB depth-chart data moved into its own draft view.</p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-white">Team</span>
          <select
            className="rounded-md border border-emerald-300/70 bg-slate-950/80 px-3 py-2 text-sm text-white shadow-[0_0_0_1px_rgba(45,212,191,0.22)]"
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(Number(event.target.value))}
          >
            {MLB_DEPTH_CHART_TEAMS.map((team) => (
              <option key={team.id} value={team.id}>
                {team.label} ({team.code})
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoadingDepth ? (
        <p className="text-sm text-slate-600">Loading depth chart...</p>
      ) : depthError ? (
        <p className="text-sm text-red-600">{depthError}</p>
      ) : depthChart ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/75 px-4 py-3 text-sm text-slate-100">
            {depthChart.team.name} ({depthChart.team.code}) · {depthChart.team.league} · Season {depthChart.season}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortDepthSlots(depthChart.slots).map((slot) => (
              <section
                key={slot.slot}
                className="rounded-xl border border-slate-700/60 bg-[linear-gradient(170deg,rgba(17,20,42,0.82),rgba(20,24,50,0.94))] p-4 shadow-[0_18px_44px_rgba(5,7,18,0.34)]"
              >
                <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-slate-700/60 pb-2">
                  <div>
                    <h3 className="text-base font-semibold text-white">{slot.slot}</h3>
                    <p className="text-xs uppercase tracking-wide text-slate-600">{slot.label}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{slot.normalizedSlot}</span>
                </div>

                <div className="space-y-3">
                  {slot.players.map((player) => (
                    <div key={`${slot.slot}-${player.mlbPlayerId}`} className="flex items-center gap-3">
                      <img
                        src={player.headshotUrl}
                        alt={player.name}
                        className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">
                          {player.depthRank}. {player.name}
                        </div>
                        <div className="text-xs text-slate-600">
                          {player.teamPosition} · {player.status || 'Active'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600">Choose a team to view its current depth chart.</p>
      )}
    </div>
  );
}
