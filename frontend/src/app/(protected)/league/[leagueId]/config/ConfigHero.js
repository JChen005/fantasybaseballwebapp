export default function ConfigHero({ form, totalRosterSlots }) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(115deg,rgba(15,23,42,0.94),rgba(12,18,35,0.78)_56%,rgba(6,78,59,0.2))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:px-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-300/70 via-white/10 to-transparent" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="h-2 w-8 rounded-full bg-emerald-300/80" />
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
              League setup
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
            Configure your league
          </h1>
          <p className="mt-2 max-w-[62ch] text-sm leading-6 text-slate-400">
            Set the format before the draft room opens.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-[1.25rem] border border-white/10 bg-slate-950/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <ConfigStat label="Teams" value={form.config.teamCount} />
          <ConfigStat label="Budget" value={`$${form.config.budget}`} tone="emerald" />
          <ConfigStat label="Slots" value={totalRosterSlots} />
        </div>
      </div>
    </div>
  );
}

function ConfigStat({ label, value, tone = 'white' }) {
  return (
    <div>
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold ${tone === 'emerald' ? 'text-emerald-100' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
