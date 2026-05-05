function StatusChip({ label, tone = 'default', value }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-400/20 bg-emerald-400/8 text-emerald-100'
      : tone === 'error'
        ? 'border-rose-400/20 bg-rose-400/8 text-rose-100'
        : 'border-white/8 bg-white/[0.03] text-slate-200';

  return (
    <div className={`rounded-full border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export default function DashboardHeader({ draftkitHealth, leagueCountLabel, userDisplayName }) {
  const normalizedHealth = String(draftkitHealth || '').toLowerCase();
  const healthTone =
    normalizedHealth === 'ok'
      ? 'success'
      : normalizedHealth === 'error'
        ? 'error'
        : 'default';
  const greetingName = userDisplayName || 'manager';

  return (
    <div className="panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
          <h1 className="text-2xl font-semibold text-white">
            Welcome back, {greetingName}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusChip label="Leagues" value={leagueCountLabel} />
          <StatusChip label="API Status" value={draftkitHealth} tone={healthTone} />
        </div>
      </div>
    </div>
  );
}
