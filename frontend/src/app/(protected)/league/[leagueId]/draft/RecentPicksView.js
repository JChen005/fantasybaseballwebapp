export default function RecentPicksView({ recentPicks, teamNameByKey }) {
  return (
    <div className="panel">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Recent Picks</h2>
        <p className="text-sm text-slate-600">Most recent picks from persisted draft history.</p>
      </div>
      {!recentPicks.length ? (
        <p className="text-sm text-slate-600">No picks have been recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {recentPicks.map((pick) => (
            <div
              key={`${pick.pickNumber}-${pick.playerId}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-900/55 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  Pick {pick.pickNumber} · {pick.playerName || pick.playerId}
                </p>
                <p className="text-xs text-slate-500">
                  {teamNameByKey.get(pick.teamKey) || pick.teamKey} · {pick.status || 'DRAFTED'}
                </p>
              </div>
              <p className="text-sm font-semibold text-emerald-100">${pick.cost || 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
