export default function RosterView({ rosterRows, getPersistedAssignedSlots }) {
  return (
    <div className="panel">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Team Roster</h2>
        <p className="text-sm text-slate-600">Current roster state for each team in the league.</p>
      </div>
      {!rosterRows.length ? (
        <p className="text-sm text-slate-600">No team state available yet.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rosterRows.map((team) => (
            <section key={team.teamKey} className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{team.teamName}</h3>
                  <p className="text-xs text-slate-500">{team.playerCount} players · ${team.spentBudget} spent</p>
                </div>
                <p className="text-sm font-semibold text-emerald-100">
                  ${Math.max(0, team.budget - team.spentBudget)} left
                </p>
              </div>
              {!team.players.length ? (
                <p className="text-sm text-slate-600">No players on this roster yet.</p>
              ) : (
                <div className="space-y-2">
                  {team.players.map((player) => (
                    <div key={`${team.teamKey}-${player.playerId}`} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-white">{player.playerName || player.playerId}</p>
                        <p className="text-xs text-slate-500">
                          {player.status} {getPersistedAssignedSlots(player).length ? `· ${getPersistedAssignedSlots(player).join(', ')}` : ''}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-200">${player.cost || 0}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
