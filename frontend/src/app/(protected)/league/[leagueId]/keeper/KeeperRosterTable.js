import { CONTRACT_OPTIONS } from './keeperPageConstants';
import { createEmptyKeeperEntry, findEntry } from './keeperPageUtils';

export default function KeeperRosterTable({
  clearEntry,
  currentRows,
  handlePlayerClick,
  playerPool,
  rowPlan,
  selectedTeamKey,
  updateEntry,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-950">
          <tr className="border-b border-slate-200 text-left">
            <th className="w-16 px-3 py-3 font-medium text-white">Pos</th>
            <th className="min-w-64 px-3 py-3 font-medium text-white">Player</th>
            <th className="w-28 px-3 py-3 font-medium text-white">Contract</th>
            <th className="w-24 px-3 py-3 font-medium text-white">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rowPlan.map(({ slot, slotIndex }, rowIndex) => {
            const entry = findEntry(currentRows, slot, slotIndex) || createEmptyKeeperEntry(slot, slotIndex);
            const player = entry.playerId ? playerPool[Number(entry.playerId)] : null;

            return (
              <tr
                key={`${selectedTeamKey}-${slot}-${slotIndex}-${rowIndex}`}
                className="border-b border-slate-200/70 transition hover:bg-white/5"
              >
                <td className="w-16 px-3 py-3 align-middle text-sm font-semibold text-slate-200">
                  {slot}
                </td>
                <td className="min-w-64 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => handlePlayerClick(selectedTeamKey, slot, slotIndex)}
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
                          clearEntry(selectedTeamKey, slot, slotIndex);
                        }}
                        className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                      >
                        Clear
                      </span>
                    ) : null}
                  </button>
                </td>
                <td className="w-28 px-3 py-3">
                  <select
                    className="input w-full"
                    value={entry.contract ?? ''}
                    onChange={(event) =>
                      updateEntry(selectedTeamKey, slot, slotIndex, { contract: event.target.value })
                    }
                  >
                    <option value=""></option>
                    {CONTRACT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="w-24 px-3 py-3">
                  <input
                    type="number"
                    min="0"
                    className="input w-full text-right"
                    value={entry.cost ?? ''}
                    onChange={(event) =>
                      updateEntry(selectedTeamKey, slot, slotIndex, {
                        cost: event.target.value === '' ? '' : Number(event.target.value),
                      })
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
