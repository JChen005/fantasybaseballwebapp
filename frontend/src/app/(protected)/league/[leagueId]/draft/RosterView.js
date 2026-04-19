'use client';

import React, { useMemo, useState } from 'react';

const SLOT_ORDER = ['C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL', 'P', 'BN'];

export default function RosterView({ rosterRows, rosterSlots, getPersistedAssignedSlots }) {
  const [expandedTeams, setExpandedTeams] = useState({});

  function toggleTeam(teamKey) {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamKey]: !prev[teamKey],
    }));
  }

  return (
    <div className="panel">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Team Roster</h2>
        <p className="text-sm text-slate-600">Current roster state for each team in the league.</p>
      </div>

      {!rosterRows.length ? (
        <p className="text-sm text-slate-600">No team state available yet.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rosterRows.map((team) => {
            const isExpanded = !!expandedTeams[team.teamKey];

            return (
              <section
                key={team.teamKey}
                className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{team.teamName}</h3>
                    <p className="text-xs text-slate-500">
                      {team.playerCount} players · ${team.spentBudget} spent
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-emerald-100">
                      ${Math.max(0, team.budget - team.spentBudget)} left
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleTeam(team.teamKey)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-slate-600 text-xs text-slate-200 transition hover:bg-white/5"
                      aria-label={isExpanded ? 'Collapse team slots' : 'Expand team slots'}
                    >
                      {isExpanded ? '▾' : '▸'}
                    </button>
                  </div>
                </div>

                {!team.players.length ? (
                  <p className="text-sm text-slate-600">No players on this roster yet.</p>
                ) : (
                  <div className="space-y-2">
                    {team.players.map((player) => (
                      <div
                        key={`${team.teamKey}-${player.playerId}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-white">{player.playerName || player.playerId}</p>
                          <p className="text-xs text-slate-500">
                            {player.status}
                            {getPersistedAssignedSlots(player).length
                              ? ` · ${getPersistedAssignedSlots(player).join(', ')}`
                              : ''}
                            {player.contract ? ` · ${player.contract}` : ''}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-200">${player.cost || 0}</p>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded ? (
                  <div className="mt-4">
                    <TeamSlotBoard
                      team={team}
                      rosterSlots={rosterSlots}
                      getPersistedAssignedSlots={getPersistedAssignedSlots}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildRowPlan(rosterSlots = {}) {
  const rows = [];

  for (const slot of SLOT_ORDER) {
    const count = Number(rosterSlots?.[slot] || 0);
    for (let index = 0; index < count; index += 1) {
      rows.push({ slot, slotIndex: index });
    }
  }

  return rows;
}

function TeamSlotBoard({ team, rosterSlots, getPersistedAssignedSlots }) {
  const rowPlan = useMemo(() => buildRowPlan(rosterSlots || {}), [rosterSlots]);

  const playersBySlot = useMemo(() => {
    const grouped = {};

    for (const player of team.players || []) {
      const assignedSlots = getPersistedAssignedSlots(player);
      const primarySlot = assignedSlots[0] || 'BN';

      if (!grouped[primarySlot]) grouped[primarySlot] = [];
      grouped[primarySlot].push(player);
    }

    return grouped;
  }, [team.players, getPersistedAssignedSlots]);

  const rows = useMemo(() => {
    const slotUsage = {};

    return rowPlan.map(({ slot, slotIndex }) => {
      const usedIndex = slotUsage[slot] || 0;
      const slotPlayers = playersBySlot[slot] || [];
      const player = slotPlayers[usedIndex] || null;

      slotUsage[slot] = usedIndex + 1;

      return {
        slot,
        slotIndex,
        player,
      };
    });
  }, [rowPlan, playersBySlot]);

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 px-4 py-3 text-sm text-slate-500">
        No roster slot data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-950">
          <tr className="border-b border-slate-200 text-left">
            <th className="w-16 px-3 py-3 font-medium text-white">Slot</th>
            <th className="min-w-52 px-3 py-3 font-medium text-white">Player</th>
            <th className="w-24 px-3 py-3 font-medium text-white">Contract</th>
            <th className="w-24 px-3 py-3 font-medium text-white">Cost</th>
            <th className="w-28 px-3 py-3 font-medium text-white">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ slot, slotIndex, player }) => (
            <tr
              key={`${team.teamKey}-${slot}-${slotIndex}`}
              className="border-b border-slate-200/70 transition hover:bg-white/5"
            >
              <td className="px-3 py-3 font-semibold text-slate-200">{slot}</td>

              {player ? (
                <>
                  <td className="px-3 py-3">
                    <div className="font-medium text-white">
                      {player.playerName || player.playerId}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-300">
                    {player.contract || '—'}
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-200">
                    ${player.cost || 0}
                  </td>
                  <td className="px-3 py-3 text-slate-300">
                    {player.status || '—'}
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-3 text-slate-500">Empty</td>
                  <td className="px-3 py-3 text-slate-500">—</td>
                  <td className="px-3 py-3 text-slate-500">—</td>
                  <td className="px-3 py-3 text-slate-500">—</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}