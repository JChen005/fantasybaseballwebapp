'use client';

import React, { useMemo, useState } from 'react';
import { leagueApi } from 'lib/leagueApi';

const CONTRACT_OPTIONS = ['F3', 'F2', 'F1', 'S3', 'S2', 'S1', 'X', 'LX'];

export default function DraftBoardView({
  leagueId,
  league,
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
  const [expandedRows, setExpandedRows] = useState({});
  const [playerNotes, setPlayerNotes] = useState({});

  const savedNotesByPlayerId = useMemo(() => {
    return (league?.playerNotes || []).reduce((acc, note) => {
      acc[String(note.id)] = note.notes || '';
      return acc;
    }, {});
  }, [league?.playerNotes]);

  function toggleRowExpanded(rowId) {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }

  function handleNoteChange(rowId, value) {
    setPlayerNotes((prev) => ({
      ...prev,
      [String(rowId)]: value,
    }));
  }

  async function handleNoteSave(row) {
    const note = (playerNotes[String(row.id)] ?? savedNotesByPlayerId[String(row.id)] ?? '').trim();

    await leagueApi.createPlayerNote(leagueId, {
      id: Number(row.id),
      notes: note,
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
      <div className="panel">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Draft Board</h2>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-white">Search</span>
            <input
              className="input"
              value={lookupQuery}
              onChange={(event) => setLookupQuery(event.target.value)}
              placeholder="Player name, team, role"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
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
                {filteredDraftRows.map((row) => {
                  const isSelected = selectedDraftPlayerId === row.id;
                  const isExpanded = !!expandedRows[row.id];

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`cursor-pointer border-b border-slate-200/70 transition hover:bg-white/5 ${
                          isSelected ? 'bg-white/6' : ''
                        }`}
                        onClick={() => handleSelectDraftPlayer(row)}
                      >
                        <td className="px-2 py-2 font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-600 text-xs text-slate-200 transition hover:bg-white/5"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleRowExpanded(row.id);
                              }}
                              aria-label={isExpanded ? 'Collapse stats' : 'Expand stats'}
                            >
                              {isExpanded ? '▾' : '▸'}
                            </button>
                            <PlayerCell row={row} />
                          </div>
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

                      {isExpanded ? (
                        <tr className="border-b border-slate-200/50 bg-slate-900/40">
                          <td colSpan={4} className="px-4 py-3">
                            <DraftStatsTable
                              row={row}
                              statsLastYear={row.statsLastYear}
                              stats3Year={row.stats3Year}
                              injuryStatus={row.injuryStatus}
                              transactions={row.transactions}
                              note={playerNotes[String(row.id)] ?? savedNotesByPlayerId[String(row.id)] ?? ''}
                              onNoteChange={handleNoteChange}
                              onNoteSave={handleNoteSave}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
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

function DraftStatsTable({
  row,
  statsLastYear,
  stats3Year,
  injuryStatus,
  transactions,
  note,
  onNoteChange,
  onNoteSave,
}) {
  const [showTransactions, setShowTransactions] = useState(false);
  const statKeys = ['avg', 'hr', 'rbi', 'sb', 'w', 'k', 'era', 'whip'];
  const transactionCount = Array.isArray(transactions) ? transactions.length : 0;

  function formatStat(value, key) {
    if (value === null || value === undefined || value === '') return '—';

    if (['avg', 'era', 'whip'].includes(key) && typeof value === 'number') {
      return value.toFixed(3);
    }

    return value;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/70 bg-slate-950/40">
      <table className="min-w-full text-xs text-left">
        <thead>
          <tr className="border-b border-slate-700 text-slate-300">
            <th className="px-2 py-2 font-medium">Window</th>
            {statKeys.map((key) => (
              <th key={key} className="px-2 py-2 font-medium uppercase">
                {key}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <StatsRow
            label="Last Year"
            stats={statsLastYear}
            statKeys={statKeys}
            formatStat={formatStat}
          />
          <StatsRow
            label="3 Year"
            stats={stats3Year}
            statKeys={statKeys}
            formatStat={formatStat}
          />

          <tr className="border-t border-slate-700">
            <td colSpan={statKeys.length + 1} className="px-2 py-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>
                  <span className="font-medium text-slate-400">Injury status:</span>{' '}
                  <span className="text-white">{injuryStatus || 'Active'}</span>
                </span>

                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left transition hover:text-white"
                  onClick={() => setShowTransactions((prev) => !prev)}
                >
                  <span className="font-medium text-slate-400">Transactions:</span>
                  <span className="text-white">{transactionCount}</span>
                  <span className="text-slate-400">{showTransactions ? '▾' : '▸'}</span>
                </button>
              </div>
            </td>
          </tr>

          {showTransactions ? (
            <tr className="border-t border-slate-700">
              <td colSpan={statKeys.length + 1} className="px-2 py-2">
                {transactionCount ? (
                  <div className="space-y-1 text-xs">
                    {transactions.map((transaction, index) => (
                      <div
                        key={`${transaction.date}-${transaction.type}-${index}`}
                        className="text-slate-300"
                      >
                        <span className="text-slate-400">{transaction.date || '—'}</span>
                        <span className="mx-2 text-white">{transaction.type || '—'}</span>
                        <span>{transaction.detail || ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No transactions</div>
                )}
              </td>
            </tr>
          ) : null}

          <tr className="border-t border-slate-700">
            <td colSpan={statKeys.length + 1} className="p-0">
              <textarea
                className="h-8 w-full resize-none bg-transparent px-2 py-1 text-xs text-white outline-none placeholder:text-slate-500"
                value={note}
                placeholder="Add note (enter to save)"
                onChange={(event) => onNoteChange(row.id, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    onNoteSave(row);
                  }
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StatsRow({ label, stats, statKeys, formatStat }) {
  return (
    <tr className="border-b border-slate-800 last:border-b-0">
      <td className="px-2 py-2 font-semibold text-white">{label}</td>
      {statKeys.map((key) => (
        <td key={key} className="px-2 py-2 text-slate-300">
          {formatStat(stats?.[key], key)}
        </td>
      ))}
    </tr>
  );
}