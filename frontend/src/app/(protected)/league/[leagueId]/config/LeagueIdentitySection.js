import ConfigSection from './ConfigSection';

export default function LeagueIdentitySection({
  form,
  onBudgetChange,
  onTeamCountChange,
  updateConfig,
  updateForm,
}) {
  return (
    <ConfigSection
      eyebrow="League identity"
      title="Rules and format"
      description="Your league format, budget, and quick-access team."
    >
      <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-5">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-white">League name</span>
          <input
            className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            value={form.name}
            onChange={(event) =>
              updateForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </label>

        <ConfigSelect
          label="League type"
          value={form.config.leagueType}
          onChange={(value) => updateConfig({ leagueType: value })}
          options={[
            { value: 'MIXED', label: 'Mixed' },
            { value: 'AL', label: 'AL Only' },
            { value: 'NL', label: 'NL Only' },
          ]}
        />

        <ConfigSelect
          label="Scoring"
          value={form.config.scoring}
          onChange={(value) => updateConfig({ scoring: value })}
          options={[
            { value: 'CATEGORY', label: 'Category' },
            { value: 'POINTS', label: 'Points' },
          ]}
        />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-white">Team count</span>
          <input
            className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4"
            type="number"
            min="1"
            value={form.config.teamCount}
            onChange={(event) => onTeamCountChange(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-white">Auction budget</span>
          <input
            className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4 font-mono"
            type="number"
            min="1"
            value={form.config.budget}
            onChange={(event) => onBudgetChange(event.target.value)}
          />
          <span className="text-xs text-slate-500">Same starting budget for every team.</span>
        </label>

        <ConfigSelect
          label="My team"
          value={form.config.userTeamKey}
          onChange={(value) => updateConfig({ userTeamKey: value })}
          options={form.config.teams.map((team) => ({
            value: team.teamKey,
            label: team.teamName || team.teamKey,
          }))}
        />
      </div>
    </ConfigSection>
  );
}

function ConfigSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-semibold text-white">{label}</span>
      <select
        className="input h-12 rounded-2xl border-white/10 bg-slate-950/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
