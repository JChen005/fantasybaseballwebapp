import { createEmptyTaxiEntry, findEntry } from './taxiPageUtils';

export default function TaxiRosterTable({
  clearEntry,
  currentRows,
  handlePlayerClick,
  playerPool,
  rowPlan,
  selectedTeamKey,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-950">
          <tr className="border-b border-slate-200 text-left">
            <th className="w-20 px-3 py-3 font-medium text-white">Slot</th>
            <th className="min-w-64 px-3 py-3 font-medium text-white">Player</th>
          </tr>
        </thead>
        <tbody>
          {rowPlan.map(({ slotIndex }, rowIndex) => {
            const entry = findEntry(currentRows, slotIndex) || createEmptyTaxiEntry(slotIndex);
            const player = entry.playerId ? playerPool[Number(entry.playerId)] : null;

            return (
              <tr
                key={`${selectedTeamKey}-taxi-${slotIndex}-${rowIndex}`}
                className="border-b border-slate-200/70 transition hover:bg-white/5"
              >
                <td className="w-20 px-3 py-3 align-middle text-sm font-semibold text-slate-200">
                  BN {slotIndex + 1}
                </td>
                <td className="min-w-64 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => handlePlayerClick(selectedTeamKey, slotIndex)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-white/5"
                  >
                    {entry.playerId ? (
                      <div className="flex min-w-0 items-center gap-2">
                        {player?.headshotUrl ? (
                          <img
                            src={player.headshotUrl}
                            alt={entry.playerName}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">
                            {entry.playerName}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Click to assign selected player</span>
                    )}

                    {entry.playerId ? (
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          clearEntry(selectedTeamKey, slotIndex);
                        }}
                        className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                      >
                        Clear
                      </span>
                    ) : null}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
