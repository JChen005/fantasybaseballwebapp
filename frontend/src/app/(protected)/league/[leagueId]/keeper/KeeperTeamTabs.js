export default function KeeperTeamTabs({ selectedTeamKey, setSelectedTeamKey, teamOptions }) {
  return (
    <div className="flex flex-wrap gap-2">
      {teamOptions.map((team) => {
        const isActive = selectedTeamKey === team.key;

        return (
          <button
            key={team.key}
            type="button"
            onClick={() => setSelectedTeamKey(team.key)}
            className={`rounded-[1rem] border px-3.5 py-2 text-sm font-semibold transition ${
              isActive
                ? 'border-emerald-300/70 bg-emerald-400/22 text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.14)]'
                : 'border-slate-300/20 bg-slate-300/7 text-slate-100 hover:bg-slate-200/12'
            }`}
          >
            {team.label}
          </button>
        );
      })}
    </div>
  );
}
