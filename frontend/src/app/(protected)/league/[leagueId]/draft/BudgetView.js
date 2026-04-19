export default function BudgetView({ rosterRows, league }) {
  return (
    <div className="panel">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Budget Overview</h2>
        <p className="text-sm text-slate-600">League budget totals and current spend by team.</p>
      </div>
      {!rosterRows.length ? (
        <p className="text-sm text-slate-600">No budget data available yet.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">League Budget</p>
            <p className="mt-2 text-3xl font-semibold text-white">${league?.config?.budget || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4 lg:col-span-2">
            <div className="space-y-3">
              {rosterRows
                .slice()
                .sort((a, b) => b.budget - b.spentBudget - (a.budget - a.spentBudget))
                .map((team) => (
                  <div key={team.teamKey}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-white">{team.teamName}</span>
                      <span className="text-slate-300">
                        ${team.spentBudget} spent · ${Math.max(0, team.budget - team.spentBudget)} left
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{
                          width: `${team.budget > 0 ? Math.min(100, (team.spentBudget / team.budget) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
