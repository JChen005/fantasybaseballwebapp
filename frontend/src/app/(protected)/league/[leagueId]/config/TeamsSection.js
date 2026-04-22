import ConfigSection from './ConfigSection';

export default function TeamsSection({ form, setUserTeamKey, updateTeam }) {
  return (
    <ConfigSection
      eyebrow="Team setup"
      title="Owners and team names"
      description="Name each roster and mark your draft room shortcut."
    >
      <div className="space-y-3 p-4 md:p-5">
        {form.config.teams.map((team, index) => (
          <TeamRow
            key={team.teamKey}
            index={index}
            isMine={form.config.userTeamKey === team.teamKey}
            setUserTeamKey={setUserTeamKey}
            team={team}
            updateTeam={updateTeam}
          />
        ))}
      </div>
    </ConfigSection>
  );
}

function TeamRow({ index, isMine, setUserTeamKey, team, updateTeam }) {
  return (
    <div
      className={`grid min-w-0 gap-3 rounded-[1.5rem] border p-4 transition duration-300 md:grid-cols-[3rem_minmax(0,1fr)] xl:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_5.75rem] xl:items-end ${
        isMine ? 'border-emerald-300/40 bg-emerald-300/[0.08]' : 'border-white/10 bg-white/[0.035]'
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 font-mono text-sm font-semibold text-slate-300">
        {index + 1}
      </div>

      <label className="flex min-w-0 flex-col gap-2 text-sm">
        <span className="font-semibold text-white">Owner name</span>
        <input
          className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4"
          value={team.ownerName}
          onChange={(event) => updateTeam(index, { ownerName: event.target.value })}
        />
      </label>

      <label className="flex min-w-0 flex-col gap-2 text-sm md:col-start-2 xl:col-start-auto">
        <span className="font-semibold text-white">Team name</span>
        <input
          className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4"
          value={team.teamName}
          onChange={(event) => updateTeam(index, { teamName: event.target.value })}
        />
      </label>

      <label className="flex h-12 w-fit items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-emerald-300/40 md:col-start-2 xl:col-start-auto xl:w-full">
        <input
          type="radio"
          name="userTeamKey"
          className="h-3.5 w-3.5"
          checked={isMine}
          onChange={() => setUserTeamKey(team.teamKey)}
        />
        Mine
      </label>
    </div>
  );
}
