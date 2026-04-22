import { ROSTER_SLOT_LABELS } from './configPageConstants';
import ConfigSection from './ConfigSection';

export default function RosterSlotsSection({ form, totalRosterSlots, updateRosterSlot }) {
  const totalBadge = (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-2 text-sm text-slate-300">
      <span className="font-mono text-emerald-100">{totalRosterSlots}</span> total slots
    </div>
  );

  return (
    <ConfigSection
      eyebrow="Roster composition"
      title="Position slots"
      description="Tune the roster shape by position."
      headerAction={totalBadge}
    >
      <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-3 xl:grid-cols-5">
        {Object.entries(form.config.rosterSlots).map(([slot, value]) => (
          <label
            key={slot}
            className="group rounded-[1.4rem] border border-white/10 bg-slate-950/30 p-4 transition duration-300 hover:border-emerald-300/30 hover:bg-white/[0.045]"
          >
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-mono text-lg font-semibold text-white">{slot}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {ROSTER_SLOT_LABELS[slot] || slot}
                </span>
              </span>
              <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-xs text-emerald-100">
                {value}
              </span>
            </span>

            <input
              className="input mt-4 h-11 rounded-2xl border-white/10 bg-slate-950/50 px-4 font-mono"
              type="number"
              min="0"
              value={value}
              onChange={(event) => updateRosterSlot(slot, event.target.value)}
            />
          </label>
        ))}
      </div>
    </ConfigSection>
  );
}
