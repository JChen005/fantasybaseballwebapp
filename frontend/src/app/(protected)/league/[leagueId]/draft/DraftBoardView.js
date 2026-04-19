'use client';

import { useState } from "react";

const CONTRACT_OPTIONS = ['F3', 'F2', 'F1', 'S3', 'S2', 'S1', 'X', 'LX'];

export default function DraftBoardView({
  filteredDraftRows,
  draftTeamFilter,
  setDraftTeamFilter,
  draftRoleFilter,
  setDraftRoleFilter,
  draftNeedFilter,
  setDraftNeedFilter,
  draftTeamOptions,
  draftRoleOptions,
  lookupQuery,
  setLookupQuery,
  isLoadingDraft,
  draftError,
  isLoadingDraftSearch,
  draftSearchError,
  selectedDraftPlayerId,
  handleSelectDraftPlayer,
  PlayerCell,
  selectedDraftPlayer,
  picks,
  handleUndoLastPick,
  isUndoingLastPick,
  draftTargetTeamKey,
  setDraftTargetTeamKey,
  teams,
  draftCost,
  setDraftCost,
  draftAssignedSlot,
  setDraftAssignedSlot,
  draftEligibleSlots,
  getOpenCountForSlot,
  draftTargetTeam,
  rosterSlots,
  draftActionError,
  handleDraftPlayer,
  isSavingDraftAction,
  contract,
  setContract
}) {

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
      <div className="panel">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Draft Board</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-white">Search</span>
              <input
                className="input"
                value={lookupQuery}
                onChange={(event) => setLookupQuery(event.target.value)}
                placeholder="Player name, team, role"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-white">Team</span>
              <select className="input" value={draftTeamFilter} onChange={(event) => setDraftTeamFilter(event.target.value)}>
                {draftTeamOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? 'All Teams' : option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-white">Role</span>
              <select className="input" value={draftRoleFilter} onChange={(event) => setDraftRoleFilter(event.target.value)}>
                {draftRoleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? 'All Roles' : option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-white">Role Need</span>
              <select className="input" value={draftNeedFilter} onChange={(event) => setDraftNeedFilter(event.target.value)}>
                <option value="ALL">All</option>
                <option value="YES">Need Only</option>
                <option value="NO">No Need</option>
              </select>
            </label>
          </div>
        </div>
        {isLoadingDraft ? (
          <p className="text-sm text-slate-600">Loading draft valuations...</p>
        ) : draftError ? (
          <p className="text-sm text-red-600">{draftError}</p>
        ) : isLoadingDraftSearch ? (
          <p className="text-sm text-slate-600">Searching players...</p>
        ) : draftSearchError ? (
          <p className="text-sm text-red-600">{draftSearchError}</p>
        ) : !filteredDraftRows.length ? (
          <p className="text-sm text-slate-600">No players match the current draft filters.</p>
        ) : (
          <div className="max-h-[720px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-2 py-2 font-medium">Player</th>
                  <th className="px-2 py-2 font-medium">Pos</th>
                  <th className="px-2 py-2 font-medium">Value</th>
                  <th className="px-2 py-2 font-medium">Role Need</th>
                </tr>
              </thead>
              <tbody>
                {filteredDraftRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-b border-slate-200/70 transition hover:bg-white/5 ${
                      selectedDraftPlayerId === row.id ? 'bg-white/6' : ''
                    }`}
                    onClick={() => handleSelectDraftPlayer(row)}
                  >
                    <td className="px-2 py-2 font-medium">
                      <PlayerCell row={row} />
                    </td>
                    <td className="px-2 py-2">{row.position}</td>
                    <td className="px-2 py-2 font-semibold text-white">
                      {typeof row.adjustedValue === 'number' ? `$${row.adjustedValue}` : 'N/A'}
                    </td>
                    <td className="px-2 py-2">
                      {typeof row.fillsNeed === 'boolean'
                        ? row.fillsNeed
                          ? `Yes${row.neededSlots?.length ? ` · ${row.neededSlots.join(', ')}` : ''}`
                          : 'No'
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Draft Control</h2>
          <p className="text-sm text-slate-600">Click a player from the valuation pool to populate this panel.</p>
        </div>
        {!selectedDraftPlayer ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-900/35 p-4">
              <p className="text-sm text-slate-500">Select a player from the pool to draft them.</p>
            </div>
            <button
              type="button"
              className="w-full rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleUndoLastPick}
              disabled={isUndoingLastPick || !picks.length}
            >
              {isUndoingLastPick ? 'Undoing...' : 'Undo Last Pick'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-4">
              <div className="flex items-center gap-3">
                {selectedDraftPlayer.headshotUrl ? (
                  <img
                    src={selectedDraftPlayer.headshotUrl}
                    alt={selectedDraftPlayer.name}
                    className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                  />
                ) : null}
                <div>
                  <h3 className="text-base font-semibold text-white">{selectedDraftPlayer.name}</h3>
                  <p className="text-sm text-slate-500">
                    {selectedDraftPlayer.team || 'No Team'} · {selectedDraftPlayer.position}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-white">Draft To Team</span>
                <select className="input" value={draftTargetTeamKey} onChange={(event) => setDraftTargetTeamKey(event.target.value)}>
                  {teams.map((team) => (
                    <option key={team.teamKey} value={team.teamKey}>
                      {team.teamName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-white">Cost</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={draftCost}
                    onChange={(event) => setDraftCost(event.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-white">Assigned Slot</span>
                <select
                  className="input"
                  value={draftAssignedSlot}
                  onChange={(event) => setDraftAssignedSlot(event.target.value)}
                  disabled={!draftEligibleSlots.length}
                >
                  {!draftEligibleSlots.length ? <option value="">No eligible slots</option> : null}
                  {draftEligibleSlots.map((slot) => {
                    const openCount = getOpenCountForSlot(draftTargetTeam, slot, rosterSlots);
                    return (
                      <option key={slot} value={slot} disabled={openCount <= 0}>
                        {slot}{openCount > 0 ? ` (${openCount} open)` : ' (full)'}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            {draftActionError ? <p className="text-sm text-red-600">{draftActionError}</p> : null}

            <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-white">Contract</span>
                <select
                  className="input"
                  value={contract}
                  onChange={(event) => setContract(event.target.value)}
                >
                  {CONTRACT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDraftPlayer}
                disabled={isSavingDraftAction}
              >
                {isSavingDraftAction ? 'Saving...' : 'Draft Player'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleUndoLastPick}
                disabled={isUndoingLastPick || !picks.length}
              >
                {isUndoingLastPick ? 'Undoing...' : 'Undo Last Pick'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
