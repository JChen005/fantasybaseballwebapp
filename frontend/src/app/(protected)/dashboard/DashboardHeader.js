function StatusChip({ label, tone = 'default', value }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-400/28 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(16,185,129,0.05))] text-emerald-50'
      : tone === 'error'
        ? 'border-rose-400/28 bg-[linear-gradient(180deg,rgba(244,63,94,0.12),rgba(244,63,94,0.05))] text-rose-50'
        : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] text-slate-100';

  return (
    <div className={`min-w-[112px] rounded-[1.35rem] border px-4 py-3 shadow-[0_12px_28px_rgba(2,6,23,0.16)] ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">{label}</p>
      <p className="mt-1 text-base font-semibold leading-none">{value}</p>
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
  const displayHealth =
    normalizedHealth === 'ok'
      ? 'OK'
      : normalizedHealth === 'error'
        ? 'Error'
        : 'Checking';

  return (
    <div className="panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
          <h1 className="text-2xl font-semibold text-white">
            Welcome back, {greetingName}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <StatusChip label="Leagues" value={leagueCountLabel} />
          <StatusChip label="API Status" value={displayHealth} tone={healthTone} />
        </div>
      </div>
    </div>
  );
}
